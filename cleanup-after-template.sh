#!/usr/bin/env bash
export LC_CTYPE=C
export LANG=C

# Prepare variables
NAME="${GITHUB_REPOSITORY##*/}"
ACTOR=$(echo $GITHUB_ACTOR | tr '[:upper:]' '[:lower:]')
SAFE_NAME=$(echo $NAME | sed 's/[^a-zA-Z0-9]//g' | tr '[:upper:]' '[:lower:]')
SAFE_ACTOR=$(echo $ACTOR | sed 's/[^a-zA-Z0-9]//g' | tr '[:upper:]' '[:lower:]')
GROUP="com.github.$SAFE_ACTOR.$SAFE_NAME"

# Replace placeholders in the template-cleanup files
sed -i "s/%NAME%/$NAME/g" ./*
sed -i "s/%REPOSITORY%/${GITHUB_REPOSITORY/\//\\/}/g" ./*
sed -i "s/%GROUP%/$GROUP/g" ./*

# Replace template package name in project files with $GROUP
find src -type f -exec sed -i "s/org.jetbrains.plugins.template/$GROUP/g" {} +
find src -type f -exec sed -i "s/IntelliJ Platform Plugin/$NAME/g" {} +
find src -type f -exec sed -i "s/JetBrains/$ACTOR/g" {} +

# Move content
cp -R .github/template-cleanup/* .

# Cleanup
rm -rf \
    .github/ISSUE_TEMPLATE \
    .github/template-cleanup \
    .github/workflows/template-cleanup.yml \
    LICENSE \
    docs

# Remove this script
rm -- "$0"
