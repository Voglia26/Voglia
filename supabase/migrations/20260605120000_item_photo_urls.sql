-- Multiple photos per item (replaces single photo_url)

alter table items add column photo_urls text[] not null default '{}';

update items
set photo_urls = array[photo_url]
where photo_url is not null;

alter table items drop column photo_url;
