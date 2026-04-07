with open("apps/api/test_run.log", "r", encoding="utf-16le") as f:
    text = f.read()
    print("LOG START")
    print(text)
    print("LOG END")
