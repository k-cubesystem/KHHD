-- Force clear today's fortunes to allow testing new prompts
DELETE FROM daily_fortunes WHERE date = CURRENT_DATE;
