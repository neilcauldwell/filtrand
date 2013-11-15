/* most popular filtered out sources on normal channels */
select count(*), source 
from filtered_tweets 
where was_emitted = false and rejected_reason = 'source not on whitelist' and channel not in ('#google','#free','#ipad', '#pizza', '#lol', '#remembranceday')
group by source 
order by count(*) desc 
limit 20;

/* most popular used sources on normal channels */
select count(*), source 
from filtered_tweets 
where channel not in ('#google','#free','#ipad', '#pizza', '#lol', '#remembranceday')
group by source 
order by count(*) desc 
limit 20;
