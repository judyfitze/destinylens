// DestinyLens Timezone Utility
// ALL site-wide dates use PST (UTC-7) — Pacific Standard Time
// This ensures consistency across dashboard, members, calculator, and Supabase

(function() {
    const TIMEZONE = 'America/Los_Angeles';
    const UTC_OFFSET = 7; // hours

    // Get today's date as YYYY-MM-DD in PST
    function getPSTDateString(date = new Date()) {
        return date.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
    }

    // Get current timestamp in PST as ISO string (for Supabase timestamps)
    function getPSTISOString(date = new Date()) {
        const pstDateStr = getPSTDateString(date);
        return pstDateStr + 'T00:00:00.000Z';
    }

    // Convert a date to PST midnight UTC (for range queries)
    function getPSTStartOfDay(date = new Date()) {
        const pstDateStr = getPSTDateString(date);
        return new Date(pstDateStr + 'T00:00:00-07:00').toISOString();
    }

    function getPSTEndOfDay(date = new Date()) {
        const pstDateStr = getPSTDateString(date);
        return new Date(pstDateStr + 'T23:59:59.999-07:00').toISOString();
    }

    // Calculate days elapsed between two dates in PST
    function getPSTDaysElapsed(startDate, endDate = new Date()) {
        const pstOffset = UTC_OFFSET * 60 * 60 * 1000;
        const pstNow = new Date(endDate.getTime() - pstOffset);
        const pstStart = new Date(startDate.getTime() - pstOffset);
        const todayPST = new Date(pstNow.getFullYear(), pstNow.getMonth(), pstNow.getDate());
        const startPST = new Date(pstStart.getFullYear(), pstStart.getMonth(), pstStart.getDate());
        return Math.floor((todayPST - startPST) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Expose globally
    window.DLTime = {
        TIMEZONE,
        UTC_OFFSET,
        getPSTDateString,
        getPSTISOString,
        getPSTStartOfDay,
        getPSTEndOfDay,
        getPSTDaysElapsed
    };
})();
