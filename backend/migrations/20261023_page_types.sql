-- Apply once to an existing MySQL installation; does not modify recorded events.
ALTER TABLE analytics_page_views MODIFY page_type ENUM('home','movie','tv','search','trailer','about','genre') NOT NULL;
