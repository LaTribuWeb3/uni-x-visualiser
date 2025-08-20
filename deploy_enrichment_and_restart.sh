echo "Evaluating ssh agent"

eval $(ssh-agent -s) 

echo "Adding private key"

ssh-add <(echo "$PRIVATE_KEY")

echo "Verifying private keys"
  
# List out your new key's fingerprint
ssh-add -l

echo "Copying files"

scp -vvv -o StrictHostKeyChecking=no package.json root@91.98.78.13:/opt/bulk-enrichment
scp -vvv -o StrictHostKeyChecking=no -r dist/scripts root@91.98.78.13:/opt/bulk-enrichment
ssh -vvv -o StrictHostKeyChecking=no root@91.98.78.13 "pm2 restart bulkEnrichment"

echo "Cleanup ssh agent"

# Don't forget to cleanup your agent after you're done using it if you're not on an ephemeral build server.
ssh-agent -k