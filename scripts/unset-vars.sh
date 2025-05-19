#!/bin/zsh

eval $(cat .env | grep -v '^#' | sed '/^$/d' | cut -d= -f1 | xargs -n1 printf 'unset %s; ')

# Print all unset variables
echo "Unset variables:"
env | grep -E '^unset ' | sed 's/^unset //'

