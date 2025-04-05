import { reverse } from 'dns/promises';

export interface IpInfo {
  country: string;
  city: string;
  isp: string;
  hostname: string[];
}

export async function getIpInfoFromMonitoring(ip: string): Promise<IpInfo | null> {
  try {
    const response = await fetch(`http://monitoring/ip_info/${ip}`);
    const data = await response.json() as [string, string, string, string[]];
    return {country: data[0], city: data[1], isp: data[2], hostname: data[3]};
  } catch (error) {
    console.error('Błąd podczas pobierania danych IP:', error);
    return null;
  }
}

export async function getIpInfo(ip: string): Promise<IpInfo | null> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    const { country, city, isp } = data;
    const hostname = await getDigHostname(ip) ?? [];
    return {country, city, isp, hostname};
  } catch (error) {
    console.error('Błąd podczas pobierania danych IP:', error);
    return null;
  }
}
export async function getDigHostname(ip: string): Promise<string[] | null> {
  try {
    const reverseResult = await reverse(ip);
    return reverseResult;
  } catch (error) {
    console.error('Błąd podczas pobierania danych DNS dla ', ip);
    return null;
  }
}

if (require.main === module) {
  async function main() {
    const ip = '195.164.189.37'; // no reverse
    // const ip = '84.40.220.90'; // has reverse
    let ipInfo = await getIpInfo(ip);
    console.log(`${ip} => ${ipInfo?.country}, ${ipInfo?.city}, ${ipInfo?.isp}, ${ipInfo?.hostname}`);
  }
  main();
}
