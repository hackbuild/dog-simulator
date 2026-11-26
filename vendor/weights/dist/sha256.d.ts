/**
 * Incremental SHA-256 (FIPS 180-4). Web Crypto digests only whole buffers,
 * and a weight file can be several GB, so the store hashes each chunk as it
 * arrives and never holds the file in one buffer.
 */
/**
 * Incremental SHA-256: call `update` with each chunk as it arrives, then `digestHex` once, so a
 * file of several GB is never held in one buffer.
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
/** Lowercase hex SHA-256 of a byte array. */
export declare function sha256Hex(data: Uint8Array): string;
