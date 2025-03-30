```sh
docker network create \
  --driver=bridge \
  --ipv6 \
  --subnet=2001:db8:baca:1::/64 \
  --gateway=2001:db8:baca:1::1 \
  app_network

docker run -d --network=app_network --name test_container alpine sleep infinity
docker exec test_container ip -6 addr show


docker network create \
  --driver=bridge \
  --ipv6 \
  --subnet=2001:db8:abcd::/64 \
  test_v6

docker run -d --network=app_network --name test_container \
  -p "0.0.0.0:5555:5555/tcp" \
  -p "[::]:5555:5555/tcp" \
  alpine sleep infinity
docker exec test_container ip -6 addr show

nc -l "::" 5555


docker network create \
  --driver=bridge \
  --ipv6 \
  --subnet=2001:db8:baca:1::/64 \
  --gateway=2001:db8:baca:1::1 \
  test_v6
docker run -d --network=test_v6 --name test_container alpine sleep infinity
docker exec test_container ip -6 addr show






#### probably to fix ping ipv6
sudo ip6tables -t nat -A POSTROUTING -o ens3 -j MASQUERADE
# and to access that port
sudo ufw route allow proto udp from any to any port 19302
# nothing configured at 8080 externally, only locally, so maybe it won't break
sudo ufw allow in proto tcp from any to any port 8080
sudo ufw allow out proto tcp from any to any port 8080
sudo ufw route allow proto tcp from any to any port 8080


sudo ufw allow in proto udp from any to any port 50000:50100
sudo ufw allow out proto udp from any to any port 50000:50100
sudo ufw allow in proto udp from any to any port 51000:51100
sudo ufw allow out proto udp from any to any port 51000:51100
sudo ufw allow in proto udp from any to any port 52000:52100
sudo ufw allow out proto udp from any to any port 52000:52100
sudo ufw allow in proto udp from any to any port 53000:53100
sudo ufw allow out proto udp from any to any port 53000:53100
sudo ufw allow in proto udp from any to any port 54000:54100
sudo ufw allow out proto udp from any to any port 54000:54100

## testing, remove if not needed
sudo ufw route allow proto tcp from any to any port 8080
sudo ufw route allow proto tcp from any to any port 3138
```
