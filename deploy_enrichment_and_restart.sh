eval $(ssh-agent -s) 
ssh-add <(echo "$PRIVATE_KEY") 
  
# List out your new key's fingerprint
ssh-add -l

scp package.json root@91.98.78.13:/opt/bulk-enrichment
scp -r dist/scripts root@91.98.78.13:/opt/bulk-enrichment
ssh root@91.98.78.13 "pm2 restart bulkEnrichment"

# Don't forget to cleanup your agent after you're done using it if you're not on an ephemeral build server.
ssh-agent -k