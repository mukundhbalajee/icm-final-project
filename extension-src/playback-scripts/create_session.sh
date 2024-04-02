#!/bin/bash

# delete existing session if it has the same name
session_name="NyquistIDE"
programming_env="Nyquist"
window_1="Editor"
window_2="Output"

# Kill all exisiting processes associated with necessary scripts
pkill -9 -f "control_editor.sh"
pkill -9 -f "nyquist_output.sh"
pkill -9 -f "process_nyquist_input.sh"
echo $PWD
# Create a named pipe if it doesn't exist
PIPE_FILE=/tmp/control_editor_pipe
if [[ ! -p "$PIPE_FILE" ]]; 
then
    echo "Creating pipe ..."
    mkfifo "$PIPE_FILE"
fi

# Define cleanup procedure
cleanup() {
    # echo "Script interrupted. Cleaning up..."
    rm -f "$PIPE_FILE" # Remove the named pipe
    tmux kill-session -a -t $session_name
    exit
}

# Check if tmux is installed
# python3 ./install_package.py
if ! command -v tmux &> /dev/null
then
    echo "tmux could not be found"
    # Attempt to install tmux
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "On Linux, you can typically install tmux using your distribution's package manager, e.g., 'sudo apt install tmux' or 'sudo yum install tmux'."
        cmd="apt-get install -y tmux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Mac OSX
        echo "On macOS, you can install tmux using Homebrew: 'brew install tmux'."
        cmd="brew install tmux"
    
    fi
    
    read -p "Do you want to continue by installing tmux? (yes/y/no/n) " -r input 
    input=$(echo "$input" | tr '[:upper:]' '[:lower:]')
    case $input in
      y|yes)
          # If user agrees, install tmux
          if [[ "$OSTYPE" == "linux-gnu"* ]]; then
              sudo apt-get install -y tmux
          elif [[ "$OSTYPE" == "darwin"* ]]; then
              brew install tmux
          else
              echo "Please install tmux manually before running script."
              exit 1
          fi
          ;;
      *)
          echo "Please install tmux manually before running script."
          exit 1
          ;;
  esac
fi

# Set trap to call cleanup function when SIGINT (Ctrl+C), SIGTERM or EXIT signal is received
trap 'cleanup' EXIT INT TERM HUP ERR

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
bash ~/.tmux/plugins/tpm/tpm

echo "Renaming Panes..."
tmux select-pane -t "$session_name:$programming_env.0" -T "$window_1"
tmux select-pane -t "$session_name:$programming_env.1" -T "$window_2"

tmux send-keys -t "$session_name:$programming_env.0" './playback-scripts/control_editor.sh' Enter &
pid1=$!

tmux send-keys -t "$session_name:$programming_env.1" './playback-scripts/nyquist_output.sh' Enter &
pid2=$!

tmux attach-session -t "$session_name"

wait $pid1 $pid2

rm -f "$PIPE_FILE" # Remove the named pipe

trap - INT TERM EXIT HUP ERR

tmux kill-session -a -t $session_name 2>/dev/null
