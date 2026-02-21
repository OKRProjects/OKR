from flask import Blueprint, request, jsonify
import os
import io
import base64
import json
import requests
from openai import OpenAI
from app.prompts.roast import ROAST_CHAT_SYSTEM

bp = Blueprint('chat', __name__)

def _build_messages_with_images(messages, images_b64):
    """Inject images into the last user message as OpenRouter multimodal content."""
    if not messages or not images_b64:
        return messages
    built = list(messages[:-1])
    last = messages[-1]
    if last.get('role') != 'user':
        return messages
    text = last.get('content') or ''
    if isinstance(text, list):
        text = next((p.get('text', '') for p in text if p.get('type') == 'text'), '')
    content = [{'type': 'text', 'text': text or '(Image attached)'}]
    for b64 in images_b64:
        content.append({
            'type': 'image_url',
            'image_url': {'url': f'data:image/jpeg;base64,{b64}'}
        })
    built.append({'role': 'user', 'content': content})
    return built

def _build_roast_messages(images_b64, user_text=None):
    """Single turn for Roast mode: system roast + user with image(s)."""
    text = (user_text or 'Roast this image.').strip()
    content = [{'type': 'text', 'text': text}]
    for b64 in images_b64:
        content.append({
            'type': 'image_url',
            'image_url': {'url': f'data:image/jpeg;base64,{b64}'}
        })
    return [
        {'role': 'system', 'content': ROAST_CHAT_SYSTEM},
        {'role': 'user', 'content': content},
    ]

@bp.route('/chat', methods=['POST'])
def chat():
    """AI Assistant: OpenRouter only. Supports text + optional images (vision model)."""
    try:
        data = request.get_json()
        
        if not data or 'messages' not in data:
            return jsonify({'error': 'Messages are required'}), 400
        
        messages = data['messages']
        images_b64 = data.get('images') or []
        has_images = isinstance(images_b64, list) and len(images_b64) > 0
        mode = data.get('mode') or 'assistant'

        if mode == 'roast' and has_images:
            last_user = next((m for m in reversed(messages) if m.get('role') == 'user'), None)
            user_text = last_user.get('content', '') if isinstance(last_user, dict) else ''
            if not user_text or (isinstance(user_text, str) and user_text.strip() in ('(See image)', '(Image attached)', '')):
                user_text = None
            else:
                user_text = user_text.strip() if isinstance(user_text, str) else None
            messages = _build_roast_messages(images_b64, user_text)
            model = os.getenv('OPENROUTER_CHAT_VISION_MODEL') or 'openai/gpt-4o-mini'
        elif has_images:
            messages = _build_messages_with_images(messages, images_b64)
            model = os.getenv('OPENROUTER_CHAT_VISION_MODEL') or 'openai/gpt-4o-mini'
        else:
            model = data.get('model', 'openai/gpt-3.5-turbo')
        
        api_key = os.getenv('OPENROUTER_API_KEY')
        if not api_key:
            return jsonify({
                'error': 'OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in your environment variables.'
            }), 500
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
            'HTTP-Referer': request.headers.get('Origin', ''),
            'X-Title': 'Hackathon Template Chatbot',
        }
        
        payload = {
            'model': model,
            'messages': messages,
        }
        
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if not response.ok:
            try:
                error_data = response.json() if response.content else {}
                error_message = error_data.get('error', {})
                if isinstance(error_message, dict):
                    error_msg = error_message.get('message', f'OpenRouter API error: {response.reason}')
                else:
                    error_msg = str(error_message) if error_message else f'OpenRouter API error: {response.reason}'
            except Exception:
                error_msg = f'OpenRouter API error: {response.reason}'
            
            return jsonify({
                'error': error_msg,
                'status_code': response.status_code
            }), response.status_code
        
        result = response.json()
        
        # Extract the assistant's message
        if 'choices' in result and len(result['choices']) > 0:
            assistant_message = result['choices'][0].get('message', {}).get('content', '')
            return jsonify({
                'message': assistant_message,
                'usage': result.get('usage', {})
            }), 200
        else:
            return jsonify({
                'error': 'No response from OpenRouter'
            }), 500
            
    except requests.exceptions.RequestException as e:
        return jsonify({
            'error': f'Network error: {str(e)}'
        }), 500
    except Exception as e:
        return jsonify({
            'error': f'Internal server error: {str(e)}'
        }), 500


def _transcribe_audio(file_storage) -> str:
    """Transcribe audio file to text using Whisper."""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError('OPENAI_API_KEY not configured')
    file_bytes = file_storage.read()
    file_like = io.BytesIO(file_bytes)
    client = OpenAI(api_key=api_key)
    transcription = client.audio.transcriptions.create(
        model='whisper-1',
        file=(file_storage.filename, file_like),
        response_format='text',
    )
    return transcription if isinstance(transcription, str) else transcription.text


OPENAI_VOICES = {'alloy', 'ash', 'ballad', 'cedar', 'coral', 'echo', 'fable', 'marin', 'nova', 'onyx', 'sage', 'shimmer', 'verse'}


def _text_to_speech(text: str, voice: str = 'coral') -> bytes:
    """Convert text to speech. OpenAI TTS for standard voices, Magic Hour for celebrity voices."""
    if voice in OPENAI_VOICES:
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError('OPENAI_API_KEY not configured')
        client = OpenAI(api_key=api_key)
        response = client.audio.speech.create(
            model='tts-1-hd',
            voice=voice,
            input=text[:4096],
            response_format='mp3',
        )
        return response.content

    # Magic Hour (celebrity voices)
    from app.routes.voice import _generate_magic_hour
    api_key = os.getenv('MAGICHOUR_API_KEY')
    if not api_key:
        raise ValueError('MAGICHOUR_API_KEY not configured for Magic Hour voices')
    body, code = _generate_magic_hour(
        text[:4096],
        voice_name=voice,
        name='Chat Pipeline',
        api_key=api_key,
    )
    if code != 200:
        err = body.get_json() if hasattr(body, 'get_json') else {}
        msg = err.get('error', 'Magic Hour TTS failed')
        raise ValueError(str(msg))
    return body.data


@bp.route('/chat/pipeline', methods=['POST'])
def chat_pipeline():
    """
    Integrated pipeline: Speech-to-Text -> Chat (text + images) -> Text-to-Speech.
    Accepts multipart: audio (optional), text (optional), images[] (optional), messages (JSON), tts (bool), voice (str).
    """
    try:
        # Parse form data
        text = (request.form.get('text') or '').strip()
        messages_json = request.form.get('messages') or '[]'
        tts = request.form.get('tts', 'false').lower() in ('true', '1', 'yes')
        voice = request.form.get('voice') or 'coral'
        mode = request.form.get('mode') or 'assistant'

        # Step 1: Transcribe audio if present
        audio_file = request.files.get('audio') or request.files.get('file')
        transcribed_text = None
        if audio_file and audio_file.filename:
            transcribed = _transcribe_audio(audio_file)
            transcribed_text = transcribed
            text = f'{text} {transcribed}'.strip() if text else transcribed

        # Step 2: Get images
        images_b64 = []
        for key in request.files:
            if key.startswith('images') or key == 'image':
                f = request.files[key]
                if f and f.filename and f.content_type and 'image' in f.content_type:
                    images_b64.append(base64.b64encode(f.read()).decode('utf-8'))

        if not text and not images_b64:
            return jsonify({'error': 'Provide audio, text, or at least one image'}), 400

        # Step 3: Build messages
        try:
            messages = json.loads(messages_json)
        except json.JSONDecodeError:
            messages = []

        user_content = text or '(See image)'
        messages.append({'role': 'user', 'content': user_content})

        # Step 4: Call chat (reuse existing logic)
        has_images = len(images_b64) > 0
        if mode == 'roast' and has_images:
            user_text = text if text and text not in ('(See image)', '(Image attached)') else None
            messages = _build_roast_messages(images_b64, user_text)
            model = os.getenv('OPENROUTER_CHAT_VISION_MODEL') or 'openai/gpt-4o-mini'
        elif has_images:
            messages = _build_messages_with_images(messages, images_b64)
            model = os.getenv('OPENROUTER_CHAT_VISION_MODEL') or 'openai/gpt-4o-mini'
        else:
            model = request.form.get('model') or os.getenv('OPENROUTER_CHAT_MODEL') or 'openai/gpt-3.5-turbo'

        api_key = os.getenv('OPENROUTER_API_KEY')
        if not api_key:
            return jsonify({'error': 'OPENROUTER_API_KEY not configured'}), 500

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
            'HTTP-Referer': request.headers.get('Origin', ''),
            'X-Title': 'Hackathon Chat Pipeline',
        }

        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json={'model': model, 'messages': messages},
            timeout=60,
        )

        if not response.ok:
            err = response.json() if response.content else {}
            msg = err.get('error', {})
            if isinstance(msg, dict):
                msg = msg.get('message', response.reason)
            return jsonify({'error': str(msg)}), response.status_code

        result = response.json()
        assistant_message = ''
        if result.get('choices'):
            assistant_message = result['choices'][0].get('message', {}).get('content', '')

        out = {'message': assistant_message, 'usage': result.get('usage', {})}
        if transcribed_text is not None:
            out['transcribed_text'] = transcribed_text

        # Step 5: TTS if requested
        if tts and assistant_message:
            try:
                audio_bytes = _text_to_speech(assistant_message, voice)
                out['audio_base64'] = base64.b64encode(audio_bytes).decode('utf-8')
                out['audio_format'] = 'wav' if voice not in OPENAI_VOICES else 'mp3'
            except Exception as e:
                out['tts_error'] = str(e)

        return jsonify(out), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Pipeline error: {str(e)}'}), 500
