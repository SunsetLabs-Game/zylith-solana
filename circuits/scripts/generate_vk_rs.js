const fs = require('fs');

const circuits = ['membership', 'swap', 'mint', 'burn'];

function toU8ArrayBE(str) {
    let hex = BigInt(str).toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    const bytes = hex.match(/.{1,2}/g).map(b => parseInt(b, 16));
    while (bytes.length < 32) bytes.unshift(0);
    return bytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ');
}

let out = `// Generated from verification_key.json for all circuits\n\n`;

for (const circuit of circuits) {
    const vkPath = `build/${circuit}/verification_key.json`;
    if (!fs.existsSync(vkPath)) {
        console.warn(`Skipping ${circuit}, VK not found`);
        continue;
    }
    const vk = JSON.parse(fs.readFileSync(vkPath, 'utf8'));

    const name = circuit.toUpperCase();

    out += `pub mod ${circuit}_vk {\n`;

    out += `    pub const VK_ALPHA_G1: [u8; 64] = [\n        ${toU8ArrayBE(vk.vk_alpha_1[0])}, \n        ${toU8ArrayBE(vk.vk_alpha_1[1])}\n    ];\n\n`;

    out += `    pub const VK_BETA_G2: [u8; 128] = [\n        ${toU8ArrayBE(vk.vk_beta_2[0][1])}, \n        ${toU8ArrayBE(vk.vk_beta_2[0][0])}, \n        ${toU8ArrayBE(vk.vk_beta_2[1][1])}, \n        ${toU8ArrayBE(vk.vk_beta_2[1][0])}\n    ];\n\n`;

    out += `    pub const VK_GAMMA_G2: [u8; 128] = [\n        ${toU8ArrayBE(vk.vk_gamma_2[0][1])}, \n        ${toU8ArrayBE(vk.vk_gamma_2[0][0])}, \n        ${toU8ArrayBE(vk.vk_gamma_2[1][1])}, \n        ${toU8ArrayBE(vk.vk_gamma_2[1][0])}\n    ];\n\n`;

    out += `    pub const VK_DELTA_G2: [u8; 128] = [\n        ${toU8ArrayBE(vk.vk_delta_2[0][1])}, \n        ${toU8ArrayBE(vk.vk_delta_2[0][0])}, \n        ${toU8ArrayBE(vk.vk_delta_2[1][1])}, \n        ${toU8ArrayBE(vk.vk_delta_2[1][0])}\n    ];\n\n`;

    out += `    pub const VK_IC: [[u8; 64]; ${vk.IC.length}] = [\n`;
    for (let i = 0; i < vk.IC.length; i++) {
        out += `        [\n            ${toU8ArrayBE(vk.IC[i][0])}, \n            ${toU8ArrayBE(vk.IC[i][1])}\n        ],\n`;
    }
    out += `    ];\n`;
    out += `}\n\n`;
}

fs.writeFileSync('../contracts/anchor/programs/zylith/src/vk.rs', out);
console.log("Wrote flat vk.rs for all circuits");
