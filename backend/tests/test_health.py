async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "operational"
    assert "version" in data
    assert "app" in data
