-- TEST SCRIPT: Preview what would be deleted during cleanup
-- This script shows what would be deleted WITHOUT actually deleting anything
-- Run this first to verify the scope before running the actual cleanup

-- Summary of submissions to be deleted
SELECT 
    'SUBMISSIONS TO DELETE - Summary' as operation,
    status,
    COUNT(*) as count,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM submissions 
WHERE story_protocol_ip_id IS NULL
GROUP BY status
ORDER BY status;

-- Detailed list of submissions to be deleted
SELECT 
    'SUBMISSIONS TO DELETE - Details' as operation,
    s.id,
    s.title,
    s.status,
    s.created_at,
    c.title as campaign_title,
    u.email as creator_email,
    u.display_name as creator_name
FROM submissions s
LEFT JOIN campaigns c ON s.campaign_id = c.id
LEFT JOIN users u ON s.creator_id = u.id
WHERE s.story_protocol_ip_id IS NULL
ORDER BY s.created_at DESC;

-- Count of related records that would be deleted
SELECT 
    'RELATED RECORDS - reviews' as table_name,
    COUNT(*) as records_to_delete
FROM reviews r
WHERE r.submission_id IN (
    SELECT id FROM submissions WHERE story_protocol_ip_id IS NULL
);

SELECT 
    'RELATED RECORDS - portfolio_items' as table_name,
    COUNT(*) as records_to_delete
FROM portfolio_items p
WHERE p.submission_id IN (
    SELECT id FROM submissions WHERE story_protocol_ip_id IS NULL
);

SELECT 
    'RELATED RECORDS - submission_assets' as table_name,
    COUNT(*) as records_to_delete
FROM submission_assets sa
WHERE sa.submission_id IN (
    SELECT id FROM submissions WHERE story_protocol_ip_id IS NULL
);

SELECT 
    'RELATED RECORDS - audit_logs' as table_name,
    COUNT(*) as records_to_delete
FROM audit_logs al
WHERE al.entity_type = 'submission' 
AND al.entity_id IN (
    SELECT id::text FROM submissions WHERE story_protocol_ip_id IS NULL
);

SELECT 
    'RELATED RECORDS - notifications' as table_name,
    COUNT(*) as records_to_delete
FROM notifications n
WHERE n.data ? 'submissionId' 
AND n.data->>'submissionId' IN (
    SELECT id::text FROM submissions WHERE story_protocol_ip_id IS NULL
);

-- Show current state for comparison
SELECT 
    'CURRENT STATE - Total submissions' as metric,
    COUNT(*) as count
FROM submissions;

SELECT 
    'CURRENT STATE - With Story Protocol' as metric,
    COUNT(*) as count
FROM submissions 
WHERE story_protocol_ip_id IS NOT NULL;

SELECT 
    'CURRENT STATE - Without Story Protocol' as metric,
    COUNT(*) as count
FROM submissions 
WHERE story_protocol_ip_id IS NULL;

-- Show what would remain after cleanup
SELECT 
    'AFTER CLEANUP - Remaining submissions' as metric,
    COUNT(*) as count
FROM submissions 
WHERE story_protocol_ip_id IS NOT NULL;

-- Additional safety checks
SELECT 
    'SAFETY CHECK - Latest submission with Story Protocol' as check_type,
    MAX(created_at) as latest_date
FROM submissions 
WHERE story_protocol_ip_id IS NOT NULL;

SELECT 
    'SAFETY CHECK - Latest submission without Story Protocol' as check_type,
    MAX(created_at) as latest_date
FROM submissions 
WHERE story_protocol_ip_id IS NULL;

-- Show assets that would lose their submission references
SELECT 
    'ASSETS ANALYSIS - Assets in submissions to be deleted' as analysis,
    COUNT(DISTINCT sa.asset_id) as unique_assets_affected
FROM submission_assets sa
WHERE sa.submission_id IN (
    SELECT id FROM submissions WHERE story_protocol_ip_id IS NULL
);

-- Show if any of these assets are used in other submissions that will remain
SELECT 
    'ASSETS ANALYSIS - Assets reused in other submissions' as analysis,
    COUNT(DISTINCT sa1.asset_id) as assets_still_used_elsewhere
FROM submission_assets sa1
WHERE sa1.asset_id IN (
    -- Assets used in submissions to be deleted
    SELECT DISTINCT sa2.asset_id 
    FROM submission_assets sa2
    WHERE sa2.submission_id IN (
        SELECT id FROM submissions WHERE story_protocol_ip_id IS NULL
    )
)
AND sa1.submission_id IN (
    -- Submissions that will remain (have story_protocol_ip_id)
    SELECT id FROM submissions WHERE story_protocol_ip_id IS NOT NULL
);

SELECT 'TEST PREVIEW COMPLETED - Review results before proceeding with actual cleanup' as status;