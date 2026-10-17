# SYN Flood / Spoofed IP Investigation Activity

## Scenario

You are an IT administrator for a company that utilizes several Windows-based servers. The IT department has designated these servers for research and design asset storage purposes. Over the last weekend, the servers experienced a high volume of use during the final stages of a new product's development. This was due to the development team working extra hours over the weekend. It is not uncommon for the development team to connect personal devices and stage multiple test environments on the internal network during the final development weekend crunch.

On Monday, users reported difficulty connecting to the internal production server DC1. As the administrator, you must investigate all areas of connectivity. You start your investigation by running a packet capture utility on a Windows desktop and then review the results for attack details.

Based on the results from the packet capture, the network IP addresses are:

- **Windows Server 2016 (DC1):** `192.168.51.186`
- **IT Workstation (WS2):** `192.168.51.75`
- **Linux Workstation (WS2):** `192.168.51.82`

Additionally, the firewall logs show no inbound traffic from the source IP addresses found in the capture.

## Given Information

### Packet Capture

```text
No.   Time      Source           Destination       Protocol   Info
4891  6.971876  12.165.62.253    192.168.51.186    TCP        6078 → 80 [SYN] Seq=0 Win=64 Len=120
4892  6.971876  24.128.197.119   192.168.51.186    TCP        6079 → 80 [SYN] Seq=0 Win=64 Len=120
4893  6.971876  105.183.6.182    192.168.51.186    TCP        6080 → 80 [SYN] Seq=0 Win=64 Len=120
4894  6.971927  144.31.96.74     192.168.51.186    TCP        6081 → 80 [SYN] Seq=0 Win=64 Len=120
4895  6.971927  206.91.160.199   192.168.51.186    TCP        6082 → 80 [SYN] Seq=0 Win=64 Len=120
4896  6.972068  197.6.201.88     192.168.51.186    TCP        6083 → 80 [SYN] Seq=0 Win=64 Len=120
```

### Command Running on Linux

```text
hping3 -c 15000 -d 120 -S -w 64 -p 80 --flood --rand-source 192.168.1.186
```

The activity provides the exact dropdown choices shown below. Pasted text

# Analysis of Questions

### Question 1

**How many addresses are spoofed?**

A. 1 address  
B. 3 addresses  
C. 5 addresses  
D. 6 addresses

✅ **Correct Answer: D. 6 addresses**

**Explanation:** The packet capture shows six different source IP addresses, while the command uses:

```text
--rand-source
```

That option generates random source IP addresses, so the six source addresses shown are spoofed.

### Question 2

**Which port did the attack target?**

A. FTP  
B. HTTP  
C. HTTPS  
D. IMAP  
E. SSH

✅ **Correct Answer: B. HTTP**

**Explanation:** The command contains:

```text
-p 80
```

Port **80** is the standard port for **HTTP**. The packet capture also shows every SYN packet going to destination port `80`.

### Question 3

**The source IP addresses are:**

A. Internal  
B. Private  
C. Spoofed  
D. Static

✅ **Correct Answer: C. Spoofed**

**Explanation:** The command uses:

```text
--rand-source
```

This tells `hping3` to generate random source IP addresses instead of using the attacker's real address.

The firewall logs also show no inbound traffic from those apparent source addresses, supporting that they are spoofed.

### Question 4

**What type of attack is this?**

A. Distributed Denial of Service (DDoS)  
B. Domain Name System (DNS) spoofing  
C. Man-in-the-Middle (MITM)  
D. Smurf  
E. SYN Flood

✅ **Correct Answer: E. SYN Flood**

**Explanation:** The attacker is rapidly sending a large number of TCP SYN requests using:

```text
-S
--flood
```

A **SYN Flood** overwhelms a server with connection requests without completing the normal TCP handshake.

### Question 5

**What request type did the server receive?**

A. Connection  
B. EncryptioN  
C. Name resolution  
D. Ping  
E. Tunnel

✅ **Correct Answer: A. Connection**

**Explanation:** A TCP **SYN** packet is used to begin a TCP connection. The server is receiving repeated connection requests.

### Question 6

**What type of handshake request is this?**

A. Half open  
B. Full  
C. One quarter  
D. Three quarter

✅ **Correct Answer: A. Half open**

**Explanation:** A SYN flood sends the first part of the TCP three-way handshake but does not finish the connection.

Normal TCP handshake:

```text
SYN → SYN-ACK → ACK
```

In this attack, the attacker sends many **SYN** requests without completing the final ACK, leaving connections **half open**.

### Question 7

**What packet size did the attack use?**

A. 64 bytes  
B. 64 kilobytes  
C. 120 bytes  
D. 120 kilobytes

✅ **Correct Answer: C. 120 bytes**

**Explanation:** The command contains:

```text
-d 120
```

and the packet capture shows:

```text
Len=120
```

So the attack used **120-byte** packets.

### Question 8

**How many packets did the attack send?**

A. 64  
B. 80  
C. 120  
D. 15000

✅ **Correct Answer: D. 15000**

**Explanation:** The command contains:

```text
-c 15000
```

The `-c` option specifies the number of packets to send, so the attack was configured to send **15,000 packets**.

### Question 9

**What is the purpose of the -S switch?**

A. Message size  
B. Packet size  
C. Seq=0  
D. SYN Flag  
E. Window Size

✅ **Correct Answer: D. SYN Flag**

**Explanation:** In `hping3`, the:

```text
-S
```

option sets the **TCP SYN flag**.

That is why the packet capture shows:

```text
[SYN]
```

for every packet.

### Question 10

**What is the window size is related to?**

A. Flow Control  
B. Logging  
C. Message size  
D. Packet size  
E. Time-to-Live

✅ **Correct Answer: A. Flow Control**

**Explanation:** The TCP window size controls how much data can be sent before an acknowledgment is required. This is part of TCP **flow control**.

The command sets the window size with:

```text
-w 64
```

and the capture confirms:

```text
Win=64
```

# Final Answer Key

1. **6 addresses** ✅  
2. **HTTP** ✅  
3. **Spoofed** ✅  
4. **SYN Flood** ✅  
5. **Connection** ✅  
6. **Half open** ✅  
7. **120 bytes** ✅  
8. **15000** ✅  
9. **SYN Flag** ✅  
10. **Flow Control** ✅