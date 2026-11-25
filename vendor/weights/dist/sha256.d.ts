/**
 * Incremental SHA-256 (FIPS 180-4). Web Crypto digests only whole buffers,
 * and a weight file can be several GB, so the store hashes each chunk as it
 * arrives and never holds the file in one buffer.
 */
export declare class Sha256 {
    private readonly h;
    private readonly w;
    private readonly buf;
    private bufLen;
    private total;
    private finished;
    update(data: Uint8Array): this;
    digestHex(): string;
    private block;
}
export declare function sha256Hex(data: Uint8Array): string;
