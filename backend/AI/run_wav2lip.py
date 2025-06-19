# C:\Users\user\Desktop\se-end\backend\AI\run_wav2lip.py

import argparse
import os
import shutil
import logging
import subprocess # Import the subprocess module

# Configure logging for detailed console output.
# Logs will display timestamp, log level, and message.
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def generate_lip_sync_video(image_path: str, audio_path: str, output_path: str) -> None:
    """
    Executes the core logic for Wav2Lip video generation.
    This function calls an external Wav2Lip inference script (inference.py)
    to generate a lip-synced video based on the input image and audio.

    Args:
        image_path (str): Local file path to the input image.
        audio_path (str): Local file path to the input audio.
        output_path (str): Local file path for the output video (.mp4).
    """
    logging.info(f"Starting lip-sync video generation...")
    logging.info(f"Input image path: {image_path}")
    logging.info(f"Input audio path: {audio_path}")
    logging.info(f"Expected output video path: {output_path}")

    # ====================================================================
    # This is the actual Wav2Lip invocation part that needs to be enabled and configured.
    # 
    # Invoking the external Wav2Lip inference script via subprocess (recommended).
    # You need to clone the Wav2Lip project to your server and specify the path to its inference script.
    # Ensure all Wav2Lip dependencies are installed in your environment, including PyTorch, OpenCV, etc.
    # Also, ensure your Conda or virtual environment is activated so the Wav2Lip script can find its dependencies.
    # 
    # Assuming the Wav2Lip project is in your 'backend/AI/Wav2Lip-master' folder.
    # ====================================================================

    # Set the base path for the Wav2Lip project
    wav2lip_base_dir: str = os.path.abspath(os.path.join(os.path.dirname(__file__), 'Wav2Lip-master'))
    wav2lip_script_path: str = os.path.join(wav2lip_base_dir, 'inference.py') # Path to your Wav2Lip inference script
    wav2lip_checkpoint_path: str = os.path.join(wav2lip_base_dir, 'checkpoints', 'wav2lip_gan.pth') # Path to your Wav2Lip model weights

    # Check if Wav2Lip related files exist
    if not os.path.exists(wav2lip_script_path):
        logging.error(f"Error: Wav2Lip inference script not found: {wav2lip_script_path}")
        logging.error("Please ensure the Wav2Lip project is cloned to the correct location (backend/AI/Wav2Lip-master).")
        raise FileNotFoundError(f"Wav2Lip inference script not found: {wav2lip_script_path}")
    if not os.path.exists(wav2lip_checkpoint_path):
        logging.error(f"Error: Wav2Lip model checkpoint not found: {wav2lip_checkpoint_path}")
        logging.error("Please ensure the Wav2Lip model checkpoint file is downloaded to the correct location (backend/AI/Wav2Lip-master/checkpoints).")
        raise FileNotFoundError(f"Wav2Lip model checkpoint not found: {wav2lip_checkpoint_path}")

    command: list[str] = [
        'python', wav2lip_script_path,
        '--checkpoint_path', wav2lip_checkpoint_path,
        '--face', image_path,
        '--audio', audio_path,
        '--outfile', output_path,
        '--noshow', # Typically no UI display is needed in a server environment
    ]

    try:
        logging.info(f"Executing Wav2Lip command: {' '.join(command)}")
        # Use check=True to raise a CalledProcessError if the subprocess returns a non-zero exit code.
        # Add encoding='utf-8' for explicit handling of stdout/stderr encoding.
        result = subprocess.run(command, capture_output=True, text=True, check=True, cwd=wav2lip_base_dir, encoding='utf-8')
        logging.info(f"Wav2Lip standard output (stdout):\n{result.stdout}")
        if result.stderr:
            logging.warning(f"Wav2Lip standard error output (stderr):\n{result.stderr}")
        logging.info(f"Wav2Lip command execution completed.")

        # Verify if the output file exists
        if not os.path.exists(output_path):
            raise FileNotFoundError(f"Wav2Lip failed to generate the expected video file: {output_path}")

        logging.info(f"Wav2Lip video generation successful and saved to: {output_path}")
    except subprocess.CalledProcessError as e:
        logging.error(f"Wav2Lip script execution failed (exit code: {e.returncode}): {e.cmd}")
        logging.error(f"Stdout:\n{e.stdout}")
        logging.error(f"Stderr:\n{e.stderr}")
        # If Wav2Lip generation fails, attempt to clean up potentially partially generated files.
        if os.path.exists(output_path):
            os.remove(output_path)
        raise Exception(f"Wav2Lip video generation failed: {e.stderr or e.stdout or e.output}")
    except Exception as e:
        logging.error(f"Wav2Lip video generation failed: {e}", exc_info=True) # Print error stack info.
        # If Wav2Lip generation fails, attempt to clean up potentially partially generated files.
        if os.path.exists(output_path):
            os.remove(output_path)
        raise # Re-raise the exception.


def main() -> None:
    """
    Main entry point for the script.
    Parses command-line arguments, processes the audio source (only uses provided audio file),
    and then calls the Wav2Lip video generation function.
    """
    parser = argparse.ArgumentParser(description='Generate AI lip-sync video.')
    parser.add_argument('--image', type=str, required=True, help='File path of the input image (e.g., C:/temp/guest_photo.jpg).')
    parser.add_argument('--audio', type=str, required=True, help='File path of the input audio (e.g., C:/temp/guest_audio.mp3).')
    parser.add_argument('--output', type=str, required=True, help='File path of the output video (e.g., C:/temp/output_video.mp4).')

    args = parser.parse_args()

    try:
        # Check if the input image file exists.
        if not os.path.exists(args.image):
            raise FileNotFoundError(f"Error: Image file not found: {args.image}")

        # Check if the provided audio file exists (audio is now required).
        if not os.path.exists(args.audio):
            raise FileNotFoundError(f"Error: Audio file not found: {args.audio}")
        
        audio_to_use: str = args.audio
        logging.info(f"Using provided audio file as input: {audio_to_use}")

        # Ensure the output video file's directory exists.
        output_dir: str = os.path.dirname(args.output)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
            logging.info(f"Output directory created: {output_dir}")

        # Call the core function to generate the lip-sync video.
        generate_lip_sync_video(args.image, audio_to_use, args.output)
        logging.info(f"AI video successfully generated and saved to: {args.output}")

        # On success, print the final video path to standard output.
        # The Node.js program (`generateAvatar.js`) will capture this output.
        print(args.output)

    except Exception as e:
        logging.error(f"An error occurred during script execution: {e}", exc_info=True) # Print detailed error info.
        # Print error message to standard error output so Node.js can capture and handle it.
        print(f"Error: {e}", file=os.sys.stderr)
        exit(1) # Exit with a non-zero status code to indicate script failure.
    finally:
        # In this version, we assume all temporary audio file cleanup is handled by the Node.js side,
        # as the audio file is now downloaded or generated by Node.js.
        # If Wav2Lip internally generates any temporary files, it should clean them up itself.
        pass # No additional temporary audio file cleanup needed here

if __name__ == "__main__":
    main() # Execute the main function.
