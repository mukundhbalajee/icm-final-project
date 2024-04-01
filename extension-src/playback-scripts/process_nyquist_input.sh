#!/bin/bash

# Initialize variables
file=""
command=""
export XLISPPATH=/Users/mukundhbalajee1/Desktop/Personal/nyquist/runtime:/Users/mukundhbalajee1/Desktop/Personal/nyquist/lib


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
    ./process_command_file.exp "$input"
    echo "exit"
    
else
    show_help
fi
