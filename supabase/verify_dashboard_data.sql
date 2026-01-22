-- Admin Dashboard Data Verification Query
SELECT 
    (SELECT COUNT(*) FROM profiles) as "Total Users",
    (SELECT COUNT(*) FROM profiles WHERE created_at >= CURRENT_DATE) as "New Users Today",
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as "Total Revenue",
    (SELECT COUNT(*) FROM saju_records) as "Total Records";
