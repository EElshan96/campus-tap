import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Replicate the CIDR functions from submit-attendance
function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
}

const VU_RANGES = ['145.108.0.0/16', '130.37.0.0/16'];

function isOnCampus(ip: string): boolean {
  return VU_RANGES.some(cidr => ipInCidr(ip, cidr));
}

// --- Tests ---

Deno.test("ipToInt converts correctly", () => {
  assertEquals(ipToInt("0.0.0.0"), 0);
  assertEquals(ipToInt("255.255.255.255"), 4294967295);
  assertEquals(ipToInt("145.108.0.0"), (145 << 24 | 108 << 16) >>> 0);
  assertEquals(ipToInt("10.0.0.1"), (10 << 24 | 1) >>> 0);
});

Deno.test("VU campus IP 145.108.x.x is on campus", () => {
  assertEquals(isOnCampus("145.108.0.1"), true);
  assertEquals(isOnCampus("145.108.255.254"), true);
  assertEquals(isOnCampus("145.108.100.50"), true);
});

Deno.test("VU campus IP 130.37.x.x is on campus", () => {
  assertEquals(isOnCampus("130.37.0.1"), true);
  assertEquals(isOnCampus("130.37.200.100"), true);
  assertEquals(isOnCampus("130.37.255.255"), true);
});

Deno.test("Non-VU IPs are off campus", () => {
  assertEquals(isOnCampus("192.168.1.1"), false);
  assertEquals(isOnCampus("10.0.0.1"), false);
  assertEquals(isOnCampus("145.109.0.1"), false); // close but different /16
  assertEquals(isOnCampus("130.38.0.1"), false);  // close but different /16
  assertEquals(isOnCampus("8.8.8.8"), false);
});

Deno.test("Edge cases for CIDR matching", () => {
  // Network address itself
  assertEquals(ipInCidr("145.108.0.0", "145.108.0.0/16"), true);
  // Broadcast address
  assertEquals(ipInCidr("145.108.255.255", "145.108.0.0/16"), true);
  // /32 matches only exact IP
  assertEquals(ipInCidr("10.0.0.1", "10.0.0.1/32"), true);
  assertEquals(ipInCidr("10.0.0.2", "10.0.0.1/32"), false);
  // /24 subnet
  assertEquals(ipInCidr("192.168.1.100", "192.168.1.0/24"), true);
  assertEquals(ipInCidr("192.168.2.100", "192.168.1.0/24"), false);
  // /0 matches everything
  assertEquals(ipInCidr("1.2.3.4", "0.0.0.0/0"), true);
});
