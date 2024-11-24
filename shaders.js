import * as THREE from 'three'; 

THREE.ShaderLib['pecking-game'] = {
    imageUniforms: {
		"u_time": { type: "f", value: null },
        "u_length": { type: "i", value: null },
        "u_interval" : { type: "f", value: null },
        "u_keys": { type: "iv", value: null },
        "u_textures": { type: "t", value: [] },
        "u_keyTextures": { type: "t", value: [] },
	},

    varying: {
		"vUV": { type: "v2" }
	},

    computeVertexShader: [
        'varying vec2 vUv;',

        'void main() {',
            'vUv = position.xy * 0.5 + 0.5;',
            'gl_Position = vec4(position, 1.0);',
        '}'
    ].join('\n'),


    imageFragmentShader: [
        'precision mediump float;',

        'varying vec2 vUv;',

        'uniform float u_time;',
        'uniform float u_interval;',
        'uniform int u_length;',
        'uniform int u_keys[8];',
        'uniform sampler2D u_textures[4];',
        'uniform sampler2D u_keyTextures[4];',

        'const float gap = 0.05;',

        'vec4 drawSquares(float x, float y) {',
            'for (int i=0; i<u_length; i++) {',
                'float cx = float(u_keys[i]) / 35.0 + 0.4;',
                'float cy = float(i) * gap + 0.5 - u_time * gap / u_interval;',
                'float size = 0.01;',
                'vec2 minUV = vec2(cx - size, cy - size);',
                'vec2 maxUV = vec2(cx + size, cy + size);',
                
                'if (x >= minUV.x && x <= maxUV.x && y >= minUV.y && y <= maxUV.y) {',
                    'vec2 texUV = vec2((x - minUV.x) / size / 2.0, (y - minUV.y) / size / 2.0);',
                    'vec4 color = vec4(1.0);',
                    'switch (u_keys[i]) {',
                        'case 0:',
                            'color = texture2D(u_textures[0], texUV);',
                            'if (color.r >= 0.95 && color.r >= 0.95 && color.r >= 0.95) {',
                                'color.a = 0.0;',
                            '}',
                            'color.rgb = 1.0 - color.rgb;',
                            'color.rgb *= vec3(0.9608, 0.7098, 0.9882);',
                            'break;',
                        'case 1:',
                            'color = texture2D(u_textures[1], texUV);',
                            'if (color.r >= 0.95 && color.r >= 0.95 && color.r >= 0.95) {',
                                'color.a = 0.0;',
                            '}',
                            'color.rgb = 1.0 - color.rgb;',
                            'color.rgb *= vec3(0.5882, 0.9686, 0.8235);',
                            'break;',
                        'case 2:',
                            'color = texture2D(u_textures[2], texUV);',
                            'if (color.r >= 0.95 && color.r >= 0.95 && color.r >= 0.95) {',
                                'color.a = 0.0;',
                            '}',
                            'color.rgb = 1.0 - color.rgb;',
                            'color.rgb *= vec3(0.9412, 0.9647, 0.5882);',
                            'break;',
                        'case 3:',
                            'color = texture2D(u_textures[3], texUV);',
                            'if (color.r >= 0.95 && color.r >= 0.95 && color.r >= 0.95) {',
                                'color.a = 0.0;',
                            '}',
                            'color.rgb = 1.0 - color.rgb;',
                            'color.rgb *= vec3(0.9882, 0.6941, 0.6941);',
                            'break;',
                    '}',
                    'return color;',
                '}',
            '}',            
            'return vec4(1.0, 1.0, 1.0, 0.0);',
        '}',

        'void main() {',
            'vec4 color = drawSquares(vUv.x, vUv.y);',
            'if (u_time >= u_interval-0.1) {',
            '}',
            'float x = vUv.x;',
            'float y = vUv.y;',
            'float cx = float(u_keys[0]) / 35.0 + 0.4;',
            'float cy = 0.5 - gap;',
            'float size = 0.01;',
            'vec2 minUV = vec2(cx - size, cy - size);',
            'vec2 maxUV = vec2(cx + size, cy + size);',
            'if (x >= minUV.x && x <= maxUV.x && y >= minUV.y && y <= maxUV.y) {',
                'vec2 texUV = vec2((x - minUV.x) / size / 2.0, (y - minUV.y) / size / 2.0);',
                'vec4 colorBox = vec4(1.0);',
                'switch (u_keys[0]) {', 
                    'case 0:',
                        'colorBox = texture2D(u_keyTextures[0], texUV);',
                        'if (colorBox.r >= 0.95 && colorBox.r >= 0.95 && colorBox.r >= 0.95) {',
                            'colorBox.a = 0.0;',
                        '}',
                        'colorBox.rgb = 1.0 - colorBox.rgb;',
                        'colorBox.rgb *= vec3(0.9608, 0.7098, 0.9882);',
                        'break;',
                    'case 1:',
                        'colorBox = texture2D(u_keyTextures[1], texUV);',
                        'if (colorBox.r >= 0.95 && colorBox.r >= 0.95 && colorBox.r >= 0.95) {',
                            'colorBox.a = 0.0;',
                        '}',
                        'colorBox.rgb = 1.0 - colorBox.rgb;',
                        'colorBox.rgb *= vec3(0.5882, 0.9686, 0.8235);',
                        'break;',
                    'case 2:',
                        'colorBox = texture2D(u_keyTextures[2], texUV);',
                        'if (colorBox.r >= 0.95 && colorBox.r >= 0.95 && colorBox.r >= 0.95) {',
                            'colorBox.a = 0.0;',
                        '}',
                        'colorBox.rgb = 1.0 - colorBox.rgb;',
                        'colorBox.rgb *= vec3(0.9412, 0.9647, 0.5882);',
                        'break;',
                    'case 3:',
                        'colorBox = texture2D(u_keyTextures[3], texUV);',
                        'if (colorBox.r >= 0.95 && colorBox.r >= 0.95 && colorBox.r >= 0.95) {',
                            'colorBox.a = 0.0;',
                        '}',
                        'colorBox.rgb = 1.0 - colorBox.rgb;',
                        'colorBox.rgb *= vec3(0.9882, 0.6941, 0.6941);',
                        'break;',  
                '}',                
                'gl_FragColor = colorBox;',
            '}',
            'else {',
                'gl_FragColor = color;',
            '}',
        '}',

    ].join('\n'),

    blurUniforms: {
        "u_image": { type: "t", value: null },
        "u_blurSize": { type: "f", value: null },
    },

    blurFragmentShader: [
        'precision mediump float;',

        'uniform sampler2D u_image;',
        'uniform float u_blurSize;',
        'varying vec2 vUv;',

        'void main() {',
            'vec4 color = vec4(0.0);',
            'float total = 0.0;',

            'float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);',
            
            'for (int i = -2; i <= 2; i++) {',
                'for (int j = -2; j <= 2; j++) {',
                    'vec2 offset = vec2(i, j) * u_blurSize;',
                    'vec4 imgColor = texture2D(u_image, vUv + offset);',
                    'float weight = weights[abs(i)] * weights[abs(j)];',
                    'color += imgColor * weight;',
                    'total += weight;',
                '}',
            '}',
            
            'gl_FragColor = color / total;',
        '}',
    ].join('\n'),

    finalUniforms: {
        "u_image": { type: "t", value: null },
        "u_blurImage": { type: "t", value: null },
    },

    vertexShader: [
        'varying vec2 vUv;',

        'void main() {',
            'vUv = uv;',
            'vec3 pos = position;',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
        '}'
    ].join('\n'),

    finalFragmentShader: [
        'precision mediump float;',

        'uniform sampler2D u_image;',
        'uniform sampler2D u_blurImage;',
        'varying vec2 vUv;',

        'void main() {',
            'vec4 originalColor = texture2D(u_image, vec2(vUv.x/2.0, vUv.y/2.0+0.275));',
            'vec4 blurredColor = texture2D(u_blurImage, vec2(vUv.x/2.0, vUv.y/2.0+0.275));',

            'vec4 finalColor = originalColor * 1.0 + blurredColor * 1.2;',
            
            'if (finalColor.r + finalColor.g + finalColor.b >= 0.5) {',
                'gl_FragColor = finalColor;',
            '}',
            'else {',
                'gl_FragColor = vec4(100.0/255.0, 41.0/255.0, 9.0/255.0, 0.0);',
            '}',
        '}',
    ].join('\n'),

    screenUniforms: {
        "u_time": { type: "f", value: null },
        "u_effectDuration": { type: "f", value: null },
    },

    screenFragmentShader: [
        'precision mediump float;',

        'uniform float u_time;',
        'uniform float u_effectDuration;',
        'varying vec2 vUv;',

        'void main() {',
            "if (u_time <= u_effectDuration) {",
                'float alphaFactor = 1.0 - abs(u_time - u_effectDuration / 2.0) / (u_effectDuration / 2.0);',
                'vec2 center = vec2(0.5, 0.5);',
                'float distance = length(vUv - center);',
                'gl_FragColor = vec4(1.0, 0.0, 0.0, distance * alphaFactor);',
            '}',
            'else {',
                'gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);',
            '}',
        '}',
    ].join('\n'),
};