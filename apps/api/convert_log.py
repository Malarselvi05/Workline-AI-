with open("apps/api/test_run.log", "r", encoding="utf-16le") as f:
    text = f.read()
with open("apps/api/test_run.txt", "w", encoding="utf-8") as f2:
    f2.write(text)
