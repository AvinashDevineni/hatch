from rest_framework.decorators import api_view
from django.http import JsonResponse, FileResponse
import json
import base64
from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

SYSTEM_PROMPT = 'You are an experienced social media marketer helping a startup founder market their business idea. DO NOT INCLUDE ANY EXTRA UNNECESSARY INFO TO YOUR RESPONSE, JUST TEXT REPRESENTING THE POST. ALSO, DO NOT ASSUME ANY INFO ABOUT THE IDEA'

@api_view(['POST'])
def post_txt(request):
    body = json.loads(request.body)
    post_txt = client.responses.create(
        model="gpt-5",
        instructions=SYSTEM_PROMPT,
        input=f'Create a marketing post based on this  idea to attract as many users as possible: "{body['idea']}".'
    )

    return JsonResponse({ 'post-txt': post_txt.output_text })

@api_view(['POST'])
def post_img(request):
    body = json.loads(request.body)
    post_img = client.images.generate(
        model="gpt-image-1",
        prompt=f'{SYSTEM_PROMPT}. Create a marketing post image to attract as many users as possible based on their idea: "{body['idea']}"',
        size='1024x1024'
    )

    img_b64 = post_img.data[0].b64_json
    img_bytes = base64.b64decode(img_b64)

    with open('debug.png', 'wb') as f:
        f.write(img_bytes)

    return FileResponse(img_bytes)
