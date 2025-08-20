echo "Evaluating ssh agent"

eval $(ssh-agent -s) 

echo "Adding private key"

ssh-add <(echo "$PRIVATE_KEY")

echo "Verifying private keys"
  
# List out your new key's fingerprint
ssh-add -l

echo "Copying package.json and installing dependencies"

scp -vvv -o StrictHostKeyChecking=no package.json root@91.98.78.13:/opt/uni-x-visualiser
ssh -vvv -o StrictHostKeyChecking=no root@91.98.78.13 "cd /opt/uni-x-visualiser && npm install"

echo "Removing package.json"

ssh -vvv -o StrictHostKeyChecking=no root@91.98.78.13 "rm /opt/uni-x-visualiser/package.json"

echo "Copying ecosystem.config.js and dist"

scp -vvv -o StrictHostKeyChecking=no ecosystem.config.js root@91.98.78.13:/opt/uni-x-visualiser
scp -vvv -o StrictHostKeyChecking=no -r dist root@91.98.78.13:/opt/uni-x-visualiser
scp -vvv -o StrictHostKeyChecking=no .env root@91.98.78.13:/opt/uni-x-visualiser

echo "Reading .env file and updating ecosystem.config.js on remote machine"

# Execute the environment variable update on the remote machine
ssh -vvv -o StrictHostKeyChecking=no root@91.98.78.13 "
cd /opt/uni-x-visualiser

echo 'Reading .env file and updating ecosystem.config.js...'

# Create a temporary file to store the updated ecosystem config
TEMP_ECOSYSTEM=\$(mktemp)

# Read the .env file and create environment variables string
ENV_VARS=''
if [ -f '.env' ]; then
    echo 'Found .env file, reading environment variables...'
    while IFS= read -r line || [ -n \"\$line\" ]; do
        # Skip empty lines and comments
        if [[ ! -z \"\$line\" && ! \"\$line\" =~ ^[[:space:]]*# ]]; then
            # Extract key and value
            key=\$(echo \"\$line\" | cut -d'=' -f1)
            value=\$(echo \"\$line\" | cut -d'=' -f2-)
            # Remove quotes from value if present
            value=\$(echo \"\$value\" | sed 's/^[\"'\'']//;s/[\"'\'']$//')
            # Add to env vars string
            if [ ! -z \"\$ENV_VARS\" ]; then
                ENV_VARS=\"\$ENV_VARS,\"
            fi
            ENV_VARS=\"\$ENV_VARS\\n      \$key: '\$value'\"
        fi
    done < .env
    echo 'Environment variables loaded from .env'
else
    echo 'No .env file found, using default environment variables'
fi

# Update ecosystem.config.js with environment variables
if [ ! -z \"\$ENV_VARS\" ]; then
    echo 'Updating ecosystem.config.js with .env variables...'
    
    # Create the updated config by replacing the env section
    awk -v env_vars=\"\$ENV_VARS\" '
    /env: {/ {
        print \"      env: {\"
        print \"        NODE_ENV: '\''production'\'',\"
        print \"        PORT: 5000,\"
        print \"        FRONTEND_URL: '\''https://feature-mongo-db.uni-x-visualiser.pages.dev'\'',\"
        printf \"%s\", env_vars
        print \"      },\"
        # Skip the original env block
        while (getline && !/},/) {
            # Skip lines until we find the closing brace
        }
        next
    }
    /env_production: {/ {
        print \"      env_production: {\"
        print \"        NODE_ENV: '\''production'\'',\"
        print \"        PORT: 5000,\"
        print \"        FRONTEND_URL: '\''https://feature-mongo-db.uni-x-visualiser.pages.dev'\'',\"
        printf \"%s\", env_vars
        print \"      },\"
        # Skip the original env_production block
        while (getline && !/},/) {
            # Skip lines until we find the closing brace
        }
        next
    }
    { print }
    ' ecosystem.config.js > \"\$TEMP_ECOSYSTEM\"

    # Replace the original file with the updated one
    mv \"\$TEMP_ECOSYSTEM\" ecosystem.config.js
    echo 'ecosystem.config.js updated successfully'
else
    echo 'No environment variables to add, keeping original ecosystem.config.js'
fi
"

# ssh -vvv -o StrictHostKeyChecking=no root@91.98.78.13 "pm2 restart /opt/uni-x-visualiser/ecosystem.config.js"

echo "Cleanup ssh agent"

# Don't forget to cleanup your agent after you're done using it if you're not on an ephemeral build server.
ssh-agent -k