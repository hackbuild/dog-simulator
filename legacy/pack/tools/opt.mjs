import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, quantize, prune, dedup } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const ratio = parseFloat(process.argv[4]||'0.15'), err=parseFloat(process.argv[5]||'0.01');
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: err }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^baseColor/, resize: [2048, 2048], quality: 82 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^normal/, resize: [1024, 1024], quality: 88 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^metallicRoughness/, resize: [512, 512], quality: 80 }),
  quantize(), prune(), dedup()
);
let tris=0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += p.getIndices().getCount()/3;
console.log('tris', tris);
await io.write(process.argv[3], doc);
