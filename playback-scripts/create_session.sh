#!/bin/bash

# Script Name: create_session.sh
# Description: This script creates a new tmux session with an editor and an output terminal for the NyquistIDE.
# It sets up the necessary environment, installs required packages, and launches the editor and output commands.
# The script performs the following steps:
# 1. Checks if a session with the given name already exists and kills it if it does.
# 2. Retrieves the number of lines and columns in the terminal.
# 3. Creates a new detached tmux session with the specified dimensions and names it.
# 4. Creates a second window by splitting the current window horizontally.
# 5. Enables mouse support and sets various tmux options for better mouse behavior.
# 6. Checks if the Tmux Plugin Manager (TPM) is installed and installs it if not.
# 7. Renames the panes in the session.
# 8. Sends commands to the panes to run the editor and output commands.
# 9. Attaches to the session and waits for the editor and output processes to finish.
# 10. Removes the named pipe.
# 11. Cleans up and exits the script.

# Usage: create_session.sh

# This function is responsible for cleaning up the resources used by the script.
# It kills all existing processes associated with necessary scripts, removes temporary files,
# and terminates the tmux session.
cleanup() {
    echo "Cleaning up create_session.sh..."
    # Kill all existing processes associated with necessary scripts
    pkill -9 -f "control_editor.sh"
    pkill -9 -f "nyquist_output.sh"
    pkill -9 -f "process_nyquist_input.sh"
    rm -rf "$dir_path/.xlisppath"
    rm -f "$PIPE_FILE" # Remove the named pipe
    tmux kill-session -a -t $session_name
    exit
}

# Function to check if a package is installed and prompt the user to install it if not found
# Arguments:
#   - package_name: The name of the package to check
#   - command_name: The name of the command associated with the package
check_package() {
    package_name=$1
    command_name=$2
    if ! command -v "$command_name" &> /dev/null
    then
        echo "$command_name could not be found"
        read -p "Do you want to continue by installing $command_name? (yes/y/no/n) " -r input 
        input=$(echo "$input" | tr '[:upper:]' '[:lower:]')
        case $input in
        y|yes)
            install_package "$package_name"
            ;;
        *)
            echo "Please install $command_name manually before running the script."
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                # Linux
                echo "On Linux, you can typically install $command_name using your distribution's package manager, e.g., 'sudo apt install $package_name' or 'sudo yum install $package_name'."
            elif [[ "$OSTYPE" == "darwin"* ]]; then
                # Mac OSX
                echo "On macOS, you can install $command_name using Homebrew: 'brew install $package_name'."
            else
                echo "Please install $command_name manually before running the script."
            fi
            exit 1
            ;;
        esac
    else
        echo "$command_name already installed!"
    fi
}

# Function to install a package using the appropriate package manager based on the operating system
# Arguments:
#   - package_name: The name of the package to install
install_package() {
    package_name=$1
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get install -y "$package_name"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Mac OSX
        brew install "$package_name"
    else
        echo "Please install $package_name manually before running the script."
        exit 1
    fi
}

# Set trap to call cleanup function when SIGINT (Ctrl+C), SIGTERM or EXIT signal is received
trap 'cleanup' EXIT INT TERM HUP

check_package "coreutils" "realpath"
check_package "tmux" "tmux"

session_name="NyquistIDE"
programming_env="Nyquist"
window_1="Editor"
window_2="Output"
dir_path="$(realpath "$(dirname "$0")")"
run_editor_command="$dir_path/control_editor.sh"
run_output_command="$dir_path/nyquist_output.sh"

# Kill all exisiting processes associated with necessary scripts
pkill -9 -f "control_editor.sh"
pkill -9 -f "nyquist_output.sh"
pkill -9 -f "process_nyquist_input.sh"
rm -rf "$dir_path/.xlisppath"

# Create a named pipe if it doesn't exist
PIPE_FILE=/tmp/control_editor_pipe
if [[ ! -p "$PIPE_FILE" ]]; 
then
    echo "Creating pipe ..."
    mkfifo "$PIPE_FILE"
fi

if tmux has-session -t "$session_name" 2>/dev/null; then
    tmux kill-session -t "$session_name"
fi

lines="$(tput lines)"
columns="$(tput cols)"

echo "Creating Editor..."
tmux new -d -x "$lines" -y "$columns" -s "$session_name" -n "$programming_env" 'bash'

# Create a second window
echo "Creating Output Terminal..."
tmux split-window -h -t "$session_name:$programming_env" 'bash'

tmux set-option -g mouse on
tmux set -g @plugin 'nhdaly/tmux-better-mouse-mode'
tmux set -g @scroll-down-exit-copy-mode "on"
tmux set -g @scroll-without-changing-pane "on"
tmux set -g @scroll-in-moused-over-pane "on"

# if ~/.tmux/plugins/tpm/ doesn't exist, install it
if [ ! -d ~/.tmux/plugins/tpm ]; then
    git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
fi
bash ~/.tmux/plugins/tpm/tpm

echo "Renaming Panes..."
tmux select-pane -t "$session_name:$programming_env.0" -T "$window_1"
tmux select-pane -t "$session_name:$programming_env.1" -T "$window_2"

tmux send-keys -t "$session_name:$programming_env.0" bash " '$run_editor_command'" Enter &
pid1=$!

tmux send-keys -t "$session_name:$programming_env.1" bash " '$run_output_command'" Enter &
pid2=$!

tmux attach-session -t "$session_name"

wait $pid1 $pid2

rm -f "$PIPE_FILE" # Remove the named pipe

trap - INT TERM EXIT HUP

tmux kill-session -a -t $session_name 2>/dev/null

echo "Exiting create_session.sh..."

exit
