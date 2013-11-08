select count(*), source 
from filtered_tweets 
where was_emitted = false and rejected_reason = 'source not on whitelist' 
group by source 
order by count(*) desc 
limit 20;
