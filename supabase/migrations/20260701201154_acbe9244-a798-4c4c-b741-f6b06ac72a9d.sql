-- Make bids.due_date nullable
ALTER TABLE public.bids ALTER COLUMN due_date DROP NOT NULL;

-- Update import_bids to allow null due_date
CREATE OR REPLACE FUNCTION public.import_bids(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec jsonb;
  v_run_id uuid := gen_random_uuid();
  v_source text := coalesce(payload->>'source','manual');
  v_imported int := 0; v_updated int := 0; v_skipped_declined int := 0; v_errors int := 0;
  v_errdetail jsonb := '[]'::jsonb;
  v_key text; v_sector bid_sector; v_tier bid_tier; v_dm delivery_method;
  v_agency text; v_project text; v_due date; v_bidnum text; v_portal text;
  v_existing uuid;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(coalesce(payload->'bids','[]'::jsonb))
  LOOP
    BEGIN
      v_agency  := nullif(btrim(rec->>'agency'),'');
      v_project := nullif(btrim(rec->>'project_name'),'');
      v_due     := nullif(btrim(rec->>'due_date'),'')::date;
      v_bidnum  := nullif(btrim(rec->>'bid_number'),'');
      v_portal  := nullif(btrim(rec->>'source_portal'),'');

      IF v_agency IS NULL OR v_project IS NULL THEN
        v_errors := v_errors + 1;
        v_errdetail := v_errdetail || jsonb_build_object('rec',rec,'error','missing agency/project_name');
        CONTINUE;
      END IF;

      v_sector := CASE
        WHEN rec->>'sector' ILIKE 'ISD' OR rec->>'sector' ILIKE '%independent school%' OR rec->>'sector' ILIKE '%school district%' THEN 'ISD'
        WHEN rec->>'sector' ILIKE '%higher%' OR rec->>'sector' ILIKE '%universit%' OR rec->>'sector' ILIKE '%college%' THEN 'Higher Education'
        WHEN rec->>'sector' ILIKE 'City%' OR rec->>'sector' ILIKE '%municipal%' THEN 'City'
        WHEN rec->>'sector' ILIKE 'County%' THEN 'County'
        WHEN rec->>'sector' ILIKE '%charter%' THEN 'Charter School'
        WHEN rec->>'sector' ILIKE '%private%' THEN 'Private Education'
        WHEN rec->>'sector' = ANY(ARRAY['ISD','Higher Education','City','County','Charter School','Private Education','Other']) THEN (rec->>'sector')::bid_sector
        ELSE 'Other' END;

      v_tier := CASE
        WHEN upper(coalesce(rec->>'tier','')) IN ('A','TIER A') THEN 'A'
        WHEN upper(coalesce(rec->>'tier','')) IN ('B','TIER B') THEN 'B'
        WHEN upper(coalesce(rec->>'tier','')) IN ('AE','A/E','A-E') OR rec->>'tier' ILIKE '%arch%' OR rec->>'tier' ILIKE '%eng%' THEN 'AE'
        ELSE 'B' END;

      v_dm := CASE
        WHEN rec->>'delivery_method' ILIKE 'CMAR' OR rec->>'delivery_method' ILIKE '%construction manager%' THEN 'CMAR'
        WHEN rec->>'delivery_method' ILIKE '%design-build%' OR rec->>'delivery_method' ILIKE '%design build%' THEN 'Design-Build'
        WHEN rec->>'delivery_method' ILIKE '%RFQ%' OR rec->>'delivery_method' ILIKE '%pre-qual%' OR rec->>'delivery_method' ILIKE '%prequal%' THEN 'RFQ/Pre-qual'
        WHEN rec->>'delivery_method' ILIKE '%architect%' OR rec->>'delivery_method' ILIKE '%engineer%' THEN 'Architect-Engineer Lead'
        WHEN rec->>'delivery_method' ILIKE 'GC' OR rec->>'delivery_method' ILIKE '%general contract%' THEN 'GC'
        WHEN rec->>'delivery_method' = ANY(ARRAY['GC','CMAR','Design-Build','RFQ/Pre-qual','Architect-Engineer Lead','Other']) THEN (rec->>'delivery_method')::delivery_method
        ELSE 'Other' END;

      IF v_bidnum IS NOT NULL THEN
        v_key := lower(regexp_replace(coalesce(v_portal,''),'[^a-zA-Z0-9]','','g')) || '::' || lower(regexp_replace(v_bidnum,'[^a-zA-Z0-9]','','g'));
      ELSE
        v_key := 'fp::' || md5(lower(regexp_replace(v_agency,'[^a-zA-Z0-9]','','g')) || '|' || lower(regexp_replace(v_project,'[^a-zA-Z0-9]','','g')) || '|' || coalesce(v_due::text,''));
      END IF;

      IF EXISTS (SELECT 1 FROM declined_keys WHERE dedup_key = v_key) THEN
        v_skipped_declined := v_skipped_declined + 1;
        CONTINUE;
      END IF;

      SELECT id INTO v_existing FROM bids WHERE dedup_key = v_key;
      IF v_existing IS NOT NULL THEN
        UPDATE bids SET
          due_date        = v_due,
          estimated_value = COALESCE((rec->>'estimated_value')::numeric, estimated_value),
          contact_name    = COALESCE(nullif(btrim(rec->>'contact_name'),''), contact_name),
          contact_email   = COALESCE(nullif(btrim(rec->>'contact_email'),''), contact_email),
          bid_url         = COALESCE(nullif(btrim(rec->>'bid_url'),''), bid_url),
          issue_date      = COALESCE((rec->>'issue_date')::date, issue_date),
          last_seen_at    = now(),
          source_run_id   = v_run_id
        WHERE id = v_existing;
        v_updated := v_updated + 1;
      ELSE
        INSERT INTO bids (bid_number, source_portal, agency, project_name, sector, tier, delivery_method,
                          estimated_value, due_date, issue_date, contact_name, contact_email, bid_url, notes,
                          status, dedup_key, last_seen_at, source_run_id)
        VALUES (v_bidnum, v_portal, v_agency, v_project, v_sector, v_tier, v_dm,
                (rec->>'estimated_value')::numeric, v_due, (rec->>'issue_date')::date,
                nullif(btrim(rec->>'contact_name'),''), nullif(btrim(rec->>'contact_email'),''),
                nullif(btrim(rec->>'bid_url'),''), nullif(btrim(rec->>'notes'),''),
                'New', v_key, now(), v_run_id);
        v_imported := v_imported + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_errdetail := v_errdetail || jsonb_build_object('rec',rec,'error',SQLERRM);
    END;
  END LOOP;

  INSERT INTO import_runs(id, source, imported, updated, skipped_dup, skipped_declined, errors, detail)
  VALUES (v_run_id, v_source, v_imported, v_updated, 0, v_skipped_declined, v_errors, v_errdetail);

  RETURN jsonb_build_object('run_id', v_run_id, 'source', v_source,
    'imported', v_imported, 'updated', v_updated,
    'skipped_declined', v_skipped_declined, 'errors', v_errors, 'error_detail', v_errdetail);
END $function$;