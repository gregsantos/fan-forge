-- Safe cleanup script for submissions without story_protocol_ip_id
-- This script removes submissions created before Story Protocol feature implementation
-- and all their related data with proper cascade handling

BEGIN;

-- First, let's see what we're about to delete
SELECT 
    'BEFORE CLEANUP - Summary' as operation,
    status,
    COUNT(*) as count
FROM submissions 
WHERE story_protocol_ip_id IS NULL
GROUP BY status
ORDER BY status;

-- Show detailed list of submissions to be deleted
SELECT 
    'SUBMISSIONS TO DELETE' as operation,
    s.id,
    s.title,
    s.status,
    s.created_at,
    c.title as campaign_title,
    u.email as creator_email
FROM submissions s
LEFT JOIN campaigns c ON s.campaign_id = c.id
LEFT JOIN users u ON s.creator_id = u.id
WHERE s.story_protocol_ip_id IS NULL
ORDER BY s.created_at DESC;

-- Count related records that will be deleted
SELECT 
    'RELATED RECORDS TO DELETE' as operation,
    'reviews' as table_name,
    COUNT(*) as count
FROM reviews r
WHERE r.submission_id IN (
    SELECT id FROM submissions WHERE story_protocol_ip_id IS NULL
);

SELECT 
    'RELATED RECORDS TO DELETE' as operation,
    'portfolio_items' as table_name,
    COUNT(*) as count
FROM portfolio_items p
WHERE p.submission_id IN (
    SELECT id FROM submissions WHERE story_protocol_ip_id IS NULL
);

SELECT 
    'RELATED RECORDS TO DELETE' as operation,
    'submission_assets' as table_name,
    COUNT(*) as count
FROM submission_assets sa
WHERE sa.submission_id IN (
    SELECT id FROM submissions WHERE story_protocol_ip_id IS NULL
);

SELECT 
    'RELATED RECORDS TO DELETE' as operation,
    'audit_logs' as table_name,
    COUNT(*) as count
FROM audit_logs al
WHERE al.entity_type = 'submission' 
AND al.entity_id IN (
    SELECT id::text FROM submissions WHERE story_protocol_ip_id IS NULL
);

SELECT 
    'RELATED RECORDS TO DELETE' as operation,
    'notifications' as table_name,
    COUNT(*) as count
FROM notifications n
WHERE n.data ? 'submissionId' 
AND n.data->>'submissionId' IN (
    SELECT id::text FROM submissions WHERE story_protocol_ip_id IS NULL
);

-- ====================================
-- ACTUAL DELETION SECTION
-- ====================================

-- Step 1: Delete reviews related to submissions without story_protocol_ip_id
DELETE FROM reviews 
WHERE submission_id IN (
    SELECT id FROM submissions WHERE story_protocol_ip_id IS NULL
);

-- Step 2: Delete portfolio items related to submissions without story_protocol_ip_id
DELETE FROM portfolio_items 
WHERE submission_id IN (
    SELECT id FROM submissions WHERE story_protocol_ip_id IS NULL
);

-- Step 3: Delete submission_assets junction table entries
DELETE FROM submission_assets 
WHERE submission_id IN (
    SELECT id FROM submissions WHERE story_protocol_ip_id IS NULL
);

-- Step 4: Delete audit logs related to submissions without story_protocol_ip_id
DELETE FROM audit_logs 
WHERE entity_type = 'submission' 
AND entity_id IN (
    SELECT id::text FROM submissions WHERE story_protocol_ip_id IS NULL
);

-- Step 5: Delete notifications related to submissions without story_protocol_ip_id
DELETE FROM notifications 
WHERE data ? 'submissionId' 
AND data->>'submissionId' IN (
    SELECT id::text FROM submissions WHERE story_protocol_ip_id IS NULL
);

-- Step 6: Finally, delete the submissions themselves
DELETE FROM submissions 
WHERE story_protocol_ip_id IS NULL;

-- Show final counts
SELECT 
    'AFTER CLEANUP - Summary' as operation,
    'submissions' as table_name,
    COUNT(*) as remaining_count
FROM submissions;

SELECT 
    'AFTER CLEANUP - With Story Protocol' as operation,
    COUNT(*) as count_with_story_protocol_ip_id
FROM submissions 
WHERE story_protocol_ip_id IS NOT NULL;

SELECT 
    'AFTER CLEANUP - Without Story Protocol' as operation,
    COUNT(*) as count_without_story_protocol_ip_id
FROM submissions 
WHERE story_protocol_ip_id IS NULL;

-- Verification queries
SELECT 
    'VERIFICATION - Orphaned reviews' as check_type,
    COUNT(*) as orphaned_count
FROM reviews r
LEFT JOIN submissions s ON r.submission_id = s.id
WHERE s.id IS NULL;

SELECT 
    'VERIFICATION - Orphaned portfolio items' as check_type,
    COUNT(*) as orphaned_count
FROM portfolio_items p
LEFT JOIN submissions s ON p.submission_id = s.id
WHERE s.id IS NULL;

SELECT 
    'VERIFICATION - Orphaned submission_assets' as check_type,
    COUNT(*) as orphaned_count
FROM submission_assets sa
LEFT JOIN submissions s ON sa.submission_id = s.id
WHERE s.id IS NULL;

COMMIT;

-- Success message
SELECT 'CLEANUP COMPLETED SUCCESSFULLY' as result;