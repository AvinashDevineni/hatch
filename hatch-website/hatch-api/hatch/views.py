from browser_use import Agent, ChatOpenAI
from dotenv import load_dotenv
import requests
from rest_framework.decorators import api_view
from django.http import JsonResponse, HttpResponse, FileResponse
import json
import base64
from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

async def agent_make_post():
    llm = ChatOpenAI(model="gpt-4.1-mini")
    task = "Find the number 1 post on Show HN"
    agent = Agent(task=task, llm=llm)
    await agent.run()

SYSTEM_PROMPT = 'You are an experienced social media marketer helping a startup founder market their business idea. DO NOT INCLUDE ANY EXTRA UNNECESSARY INFO TO YOUR RESPONSE, JUST TEXT REPRESENTING THE POST. ALSO, DO NOT ASSUME ANY INFO ABOUT THE IDEA'

@api_view(['POST'])
def generate_post_txt(request):
    body = json.loads(request.body)
    post_txt = client.responses.create(
        model="gpt-5",
        instructions=SYSTEM_PROMPT,
        input=f'Create a marketing post based on this  idea to attract as many users as possible: "{body['idea']}".'
    )

    return JsonResponse({ 'post-txt': post_txt.output_text })

@api_view(['POST'])
def generate_post_img(request):
    body = json.loads(request.body)
    post_img = client.images.generate(
        model="gpt-image-1",
        prompt=f'{SYSTEM_PROMPT}. Create a marketing post image to attract as many users as possible based on their idea: "{body['idea']}"',
        size='1024x1024'
    )

    img_b64 = post_img.data[0].b64_json
    img_bytes = base64.b64decode(img_b64)

    with open('response.png', 'wb') as f:
        f.write(img_bytes)

    return FileResponse(open('response.png', 'rb'))

@api_view(['POST'])
def make_post(request):
    post_img = request.FILES['post_img']
    post_txt = request.POST['post_txt']

    with open('./static/post_img.png', 'wb') as f:
        for chunk in post_img.chunks():
            f.write(chunk)

    with open('./static/post_img.png', 'rb') as f:
        res = requests.post('https://api.imgbb.com/1/upload', {
            'image': base64.b64encode(f.read()),
            'key': 'ad37ca731158775c1c7f0351fe562737'
        })

    print(res.json())
    imgUrl = res.json()['data']['url']
    
    url = "https://api.ayrshare.com/api/post"
    headers = {
        "Authorization": "Bearer 890A6E79-E4A14AC5-8691038C-DDB547DC",
        "Content-Type": "application/json"
    }

    data = {
        "post": post_txt,
        "platforms": ["linkedin"],
        "mediaUrls": [imgUrl]
    }

    res = requests.post(url, json=data, headers=headers)
    print(res.json())

    return HttpResponse()
