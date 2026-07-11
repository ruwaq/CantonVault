export function shortParty(party: string): string {
    if (!party) return '-';
    if (party.length <= 16) return party;
    return `${party.slice(0, 8)}...${party.slice(-4)}`;
}
