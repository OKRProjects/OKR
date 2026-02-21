from flask import Blueprint, request, Response, jsonify
import os
from openai import OpenAI

bp = Blueprint('speech', __name__)

MAX_TEXT_LENGTH = 4096


@bp.route('/speech', methods=['POST'])
def text_to_speech():
    """Converts text to speech using OpenAI TTS API"""
    try:
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OPENAI_API_KEY not configured'}), 500

        data = request.get_json() or {}
        text = data.get('text', '').strip()
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        if len(text) > MAX_TEXT_LENGTH:
            return jsonify({'error': f'Text too long. Maximum: {MAX_TEXT_LENGTH} characters'}), 400

        voice = data.get('voice', 'coral')
        model = data.get('model', 'tts-1-hd')
        response_format = data.get('response_format', 'mp3')

        client = OpenAI(api_key=api_key)

        response = client.audio.speech.create(
            model=model,
            voice=voice,
            input=text,
            response_format=response_format,
        )

        audio_bytes = response.content

        mimetype = 'audio/mpeg' if response_format == 'mp3' else f'audio/{response_format}'
        return Response(audio_bytes, mimetype=mimetype)

    except Exception as e:
        error_msg = str(e)
        if 'api_key' in error_msg.lower() or 'invalid' in error_msg.lower():
            return jsonify({'error': 'Invalid or expired API key'}), 401
        return jsonify({'error': f'Text-to-speech error: {error_msg}'}), 500
