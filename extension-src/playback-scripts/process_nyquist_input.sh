#!/bin/bash

# Initialize variables
file=""
command=""
dir_path="$(realpath "$(dirname "$0")")"

# Path to the file where the XLISPPATH will be saved
PATH_FILE="$dir_path/.xlisppath"

# Check if the path file exists
if [[ -f "$PATH_FILE" ]]; then
    # Read the path from the file and set the XLISPPATH variable
    XLISPPATH=$(cat "$PATH_FILE")
    export XLISPPATH
else
    # Ask the user for the path and save it to the file
    echo "Please enter the XLISPPATH (format: /path/to/nyquist):"
    read userPath
    echo "$userPath/runtime:$userPath/lib" > "$PATH_FILE"
    export XLISPPATH="$userPath/runtime:$userPath/lib"
fi

# Confirm the XLISPPATH is set
echo "XLISPPATH is set to: $XLISPPATH"


# Function to display help message
show_help() {
    echo "Usage: $0 -f <filename> | -c <command> | -h"
    echo ""
    echo "Options:"
    echo "  -f <filename>    Process the specified file."
    echo "  -c <command>     Execute the specified command."
    echo "  -h               Display this help message and exit."
    exit 0
}

# Parse options
while getopts "f:c:h" opt; do
    case $opt in
        f)
            fileFlag=true
            commandFlag=false
            input="load $OPTARG"
            ;;
        c)
            commandFlag=true
            fileFlag=false
            input="$OPTARG"
            ;;
        h)
            show_help
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            exit 1
            ;;
        :)
            echo "Option -$OPTARG requires an argument." >&2
            exit 1
            ;;
    esac
done

# Check if the file option was provided and the file exists
if $fileFlag; then
    if [ -f "$input" ]; then
        process_file "$input"
    else
        echo "File not found: $input"
        exit 1
    fi

elif $commandFlag; then
    expect "$dir_path/process_command_file.exp" "$input"
    
else
    show_help
fi
