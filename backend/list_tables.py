import urllib.request
try:
    req = urllib.request.Request("http://127.0.0.1:3000/meetups/upcoming")
    response = urllib.request.urlopen(req)
    print(response.read())
except urllib.error.HTTPError as e:
    print(e.read())
