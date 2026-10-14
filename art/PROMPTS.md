# 画像生成プロンプト集（自動生成: node scripts/art.mjs prompts）

ChatGPT の画像生成に1枚ずつ貼る。できた画像は **art/<slug>/<枠名>.png** に保存 → `npm run art:build` で反映。
- 透過が必要な枠（hero/item）は、透過PNGで出せなければ白背景のままでOK（build が白を抜く。完全ではないので可能なら透過で）。
- 1枚ずつ、世界観が揃うよう同じ会話の中で作ると光が揃いやすい。
- 文字・ロゴ・絵文字は入れさせない（プロンプトに含み済み）。

---
## おじさんを積め！  `ojisan-stack`
世界観: concrete rooftop terrace of an office building at golden hour, hazy city skyline ／ 光: warm low sun from the left, long soft shadows

### ojisan-stack/key  ⬜未生成
保存先: `art/ojisan-stack/key.png` ／ 1024x1536 
```
Vertical 2:3 key visual for a mobile game. The hero subject is large (about 60% of the frame), placed slightly below center. Leave the top 25% of the frame calm and uncluttered for a title overlay. Subject: five ordinary middle-aged Japanese office workers in rumpled suits balancing precariously stacked on each other's shoulders on a narrow steel beam, wobbling, calm deadpan faces
Setting/world: concrete rooftop terrace of an office building at golden hour, hazy city skyline. Lighting: warm low sun from the left, long soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### ojisan-stack/bg  ⬜未生成
保存先: `art/ojisan-stack/bg.png` ／ 1024x1536 
```
Vertical 2:3 background plate for gameplay. The hero object is NOT present. The central 50% of the frame stays calm and uncluttered so game objects can move over it. Scene: empty rooftop with a narrow steel beam platform in the lower third, golden-hour city skyline, light haze
Setting/world: concrete rooftop terrace of an office building at golden hour, hazy city skyline. Lighting: warm low sun from the left, long soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### ojisan-stack/hero  ⬜未生成
保存先: `art/ojisan-stack/hero.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a middle-aged Japanese office worker in a rumpled grey suit and loosened tie, standing upright, arms slightly out for balance, deadpan expression, full body
Setting/world: concrete rooftop terrace of an office building at golden hour, hazy city skyline. Lighting: warm low sun from the left, long soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### ojisan-stack/item  ⬜未生成
保存先: `art/ojisan-stack/item.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a heavyset middle-aged Japanese office worker in a straining white shirt and tie, full body, standing, slightly sweating
Setting/world: concrete rooftop terrace of an office building at golden hour, hazy city skyline. Lighting: warm low sun from the left, long soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### ojisan-stack/result_good  ⬜未生成
保存先: `art/ojisan-stack/result_good.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a towering human stack of salarymen on a rooftop reaching toward the clouds, workers at the bottom grimacing
Setting/world: concrete rooftop terrace of an office building at golden hour, hazy city skyline. Lighting: warm low sun from the left, long soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

### ojisan-stack/result_bad  ⬜未生成
保存先: `art/ojisan-stack/result_bad.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a pile of tangled salarymen collapsed on a rooftop, briefcases and shoes scattered, dust in the air
Setting/world: concrete rooftop terrace of an office building at golden hour, hazy city skyline. Lighting: warm low sun from the left, long soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

---
## おならエレベーター  `fart-elevator`
世界観: a vivid blue sky above a quiet suburban rooftop, thin clouds, becoming deep space at the top ／ 光: bright midday sun from upper right, crisp clouds

### fart-elevator/key  ⬜未生成
保存先: `art/fart-elevator/key.png` ／ 1024x1536 
```
Vertical 2:3 key visual for a mobile game. The hero subject is large (about 60% of the frame), placed slightly below center. Leave the top 25% of the frame calm and uncluttered for a title overlay. Subject: a middle-aged Japanese office worker in a suit rocketing straight up through the clouds, hands on his lap in a seated pose, a thick soft plume of pale vapor beneath him, serious face
Setting/world: a vivid blue sky above a quiet suburban rooftop, thin clouds, becoming deep space at the top. Lighting: bright midday sun from upper right, crisp clouds.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### fart-elevator/bg  ⬜未生成
保存先: `art/fart-elevator/bg.png` ／ 1024x1536 
```
Vertical 2:3 background plate for gameplay. The hero object is NOT present. The central 50% of the frame stays calm and uncluttered so game objects can move over it. Scene: vertical sky gradient from pale suburban roofline at the bottom, through scattered clouds, to the dark blue edge of space with stars at the top, no people
Setting/world: a vivid blue sky above a quiet suburban rooftop, thin clouds, becoming deep space at the top. Lighting: bright midday sun from upper right, crisp clouds.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### fart-elevator/hero  ⬜未生成
保存先: `art/fart-elevator/hero.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a middle-aged Japanese office worker in a suit in a mid-air seated pose, calm serious face, arms crossed, full body
Setting/world: a vivid blue sky above a quiet suburban rooftop, thin clouds, becoming deep space at the top. Lighting: bright midday sun from upper right, crisp clouds.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### fart-elevator/item  ⬜未生成
保存先: `art/fart-elevator/item.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a crow in flight with wings fully spread, seen from slightly below, dark glossy feathers
Setting/world: a vivid blue sky above a quiet suburban rooftop, thin clouds, becoming deep space at the top. Lighting: bright midday sun from upper right, crisp clouds.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### fart-elevator/result_good  ⬜未生成
保存先: `art/fart-elevator/result_good.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: the curved horizon of the Earth seen from orbit with a small tiny salaryman floating, tie drifting
Setting/world: a vivid blue sky above a quiet suburban rooftop, thin clouds, becoming deep space at the top. Lighting: bright midday sun from upper right, crisp clouds.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

### fart-elevator/result_bad  ⬜未生成
保存先: `art/fart-elevator/result_bad.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a salaryman lying flat on a suburban rooftop looking at the sky, dignified despair
Setting/world: a vivid blue sky above a quiet suburban rooftop, thin clouds, becoming deep space at the top. Lighting: bright midday sun from upper right, crisp clouds.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

---
## ハゲを守れ！  `save-the-hair`
世界観: a dark minimal studio with a powerful industrial fan out of frame, drifting dust in strong wind ／ 光: hard rim light from behind, cool key from the front

### save-the-hair/key  ⬜未生成
保存先: `art/save-the-hair/key.png` ／ 1024x1536 
```
Vertical 2:3 key visual for a mobile game. The hero subject is large (about 60% of the frame), placed slightly below center. Leave the top 25% of the frame calm and uncluttered for a title overlay. Subject: close-up portrait of a bald middle-aged Japanese man with exactly one single long hair on top of his head streaming sideways in a violent wind, eyes tightly focused and tearful
Setting/world: a dark minimal studio with a powerful industrial fan out of frame, drifting dust in strong wind. Lighting: hard rim light from behind, cool key from the front.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### save-the-hair/bg  ⬜未生成
保存先: `art/save-the-hair/bg.png` ／ 1024x1536 
```
Vertical 2:3 background plate for gameplay. The hero object is NOT present. The central 50% of the frame stays calm and uncluttered so game objects can move over it. Scene: empty dark studio, strong horizontal wind visible in drifting dust and paper scraps, soft rim light, no people
Setting/world: a dark minimal studio with a powerful industrial fan out of frame, drifting dust in strong wind. Lighting: hard rim light from behind, cool key from the front.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### save-the-hair/hero  ⬜未生成
保存先: `art/save-the-hair/hero.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: head and shoulders of a bald middle-aged Japanese man in a white shirt, eyes clenched, one hand raised to hold the top of his head, front view
Setting/world: a dark minimal studio with a powerful industrial fan out of frame, drifting dust in strong wind. Lighting: hard rim light from behind, cool key from the front.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### save-the-hair/item  ⬜未生成
保存先: `art/save-the-hair/item.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: macro of a single long black hair strand curving in the air, glossy, in focus
Setting/world: a dark minimal studio with a powerful industrial fan out of frame, drifting dust in strong wind. Lighting: hard rim light from behind, cool key from the front.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### save-the-hair/result_good  ⬜未生成
保存先: `art/save-the-hair/result_good.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a bald man in a gale standing proudly, one hair still intact, hair standing straight in the wind
Setting/world: a dark minimal studio with a powerful industrial fan out of frame, drifting dust in strong wind. Lighting: hard rim light from behind, cool key from the front.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

### save-the-hair/result_bad  ⬜未生成
保存先: `art/save-the-hair/result_bad.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a single black hair flying away over a city, a bald man's tiny silhouette looking up in the distance
Setting/world: a dark minimal studio with a powerful industrial fan out of frame, drifting dust in strong wind. Lighting: hard rim light from behind, cool key from the front.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

---
## 鼻毛を抜け！  `nosehair-pull`
世界観: a clean bright bathroom with a large mirror and a vanity shelf ／ 光: bright cool vanity light from above, clinical and honest

### nosehair-pull/key  ⬜未生成
保存先: `art/nosehair-pull/key.png` ／ 1024x1536 
```
Vertical 2:3 key visual for a mobile game. The hero subject is large (about 60% of the frame), placed slightly below center. Leave the top 25% of the frame calm and uncluttered for a title overlay. Subject: extreme close-up of a man's nostril with one long nose hair, shot like a macro beauty ad, a pair of silver tweezers entering from the side
Setting/world: a clean bright bathroom with a large mirror and a vanity shelf. Lighting: bright cool vanity light from above, clinical and honest.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### nosehair-pull/bg  ⬜未生成
保存先: `art/nosehair-pull/bg.png` ／ 1024x1536 
```
Vertical 2:3 background plate for gameplay. The hero object is NOT present. The central 50% of the frame stays calm and uncluttered so game objects can move over it. Scene: empty bright bathroom vanity with a mirror reflecting white tiles, shallow depth of field, no people
Setting/world: a clean bright bathroom with a large mirror and a vanity shelf. Lighting: bright cool vanity light from above, clinical and honest.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### nosehair-pull/hero  ⬜未生成
保存先: `art/nosehair-pull/hero.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: silver stainless-steel tweezers, slightly open, 3/4 angle, polished metal reflections
Setting/world: a clean bright bathroom with a large mirror and a vanity shelf. Lighting: bright cool vanity light from above, clinical and honest.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### nosehair-pull/item  ⬜未生成
保存先: `art/nosehair-pull/item.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: one long dark hair strand stretched taut in a slight curve, macro, glossy
Setting/world: a clean bright bathroom with a large mirror and a vanity shelf. Lighting: bright cool vanity light from above, clinical and honest.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### nosehair-pull/result_good  ⬜未生成
保存先: `art/nosehair-pull/result_good.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a man proudly holding up an absurdly long hair pinched between tweezers in front of a bathroom mirror, serious face
Setting/world: a clean bright bathroom with a large mirror and a vanity shelf. Lighting: bright cool vanity light from above, clinical and honest.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

### nosehair-pull/result_bad  ⬜未生成
保存先: `art/nosehair-pull/result_bad.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a man with watering eyes and a red nose in a bathroom mirror, tweezers in hand, pained look
Setting/world: a clean bright bathroom with a large mirror and a vanity shelf. Lighting: bright cool vanity light from above, clinical and honest.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

---
## 絶対に押すなボタン  `dont-press`
世界観: a minimalist white laboratory room with a single stainless pedestal, subtle yellow-black hazard tape on the floor ／ 光: clean overhead softbox light, crisp soft shadows

### dont-press/key  ⬜未生成
保存先: `art/dont-press/key.png` ／ 1024x1536 
```
Vertical 2:3 key visual for a mobile game. The hero subject is large (about 60% of the frame), placed slightly below center. Leave the top 25% of the frame calm and uncluttered for a title overlay. Subject: a huge glossy red industrial push button on a brushed steel pedestal, transparent safety cover flipped open, dramatic ad lighting, no text
Setting/world: a minimalist white laboratory room with a single stainless pedestal, subtle yellow-black hazard tape on the floor. Lighting: clean overhead softbox light, crisp soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### dont-press/bg  ⬜未生成
保存先: `art/dont-press/bg.png` ／ 1024x1536 
```
Vertical 2:3 background plate for gameplay. The hero object is NOT present. The central 50% of the frame stays calm and uncluttered so game objects can move over it. Scene: empty minimalist white lab room, a faint hazard-tape line on the concrete floor, no button, no text
Setting/world: a minimalist white laboratory room with a single stainless pedestal, subtle yellow-black hazard tape on the floor. Lighting: clean overhead softbox light, crisp soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### dont-press/hero  ⬜未生成
保存先: `art/dont-press/hero.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a large glossy red industrial push button in its raised state on a brushed steel base, 3/4 angle from above, no text
Setting/world: a minimalist white laboratory room with a single stainless pedestal, subtle yellow-black hazard tape on the floor. Lighting: clean overhead softbox light, crisp soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### dont-press/item  ⬜未生成
保存先: `art/dont-press/item.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: the same large glossy red push button fully pressed down, base visible, 3/4 angle from above, no text
Setting/world: a minimalist white laboratory room with a single stainless pedestal, subtle yellow-black hazard tape on the floor. Lighting: clean overhead softbox light, crisp soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### dont-press/result_good  ⬜未生成
保存先: `art/dont-press/result_good.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: the white lab room filled with falling confetti and a startled researcher in a lab coat, shot like a news photo
Setting/world: a minimalist white laboratory room with a single stainless pedestal, subtle yellow-black hazard tape on the floor. Lighting: clean overhead softbox light, crisp soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

### dont-press/result_bad  ⬜未生成
保存先: `art/dont-press/result_bad.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: the same white lab room completely quiet and empty, only the red button sitting on its pedestal, dramatic stillness
Setting/world: a minimalist white laboratory room with a single stainless pedestal, subtle yellow-black hazard tape on the floor. Lighting: clean overhead softbox light, crisp soft shadows.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

---
## 目玉焼きを落とせ  `egg-landing`
世界観: a home kitchen stovetop seen from above at a slight angle, wooden counter ／ 光: soft window light from the left, warm kitchen tones

### egg-landing/key  ⬜未生成
保存先: `art/egg-landing/key.png` ／ 1024x1536 
```
Vertical 2:3 key visual for a mobile game. The hero subject is large (about 60% of the frame), placed slightly below center. Leave the top 25% of the frame calm and uncluttered for a title overlay. Subject: a fresh egg falling in mid-air above a black cast-iron frying pan with a faint oil sheen, the egg slightly cracked, tiny droplets, high-speed photography look
Setting/world: a home kitchen stovetop seen from above at a slight angle, wooden counter. Lighting: soft window light from the left, warm kitchen tones.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### egg-landing/bg  ⬜未生成
保存先: `art/egg-landing/bg.png` ／ 1024x1536 
```
Vertical 2:3 background plate for gameplay. The hero object is NOT present. The central 50% of the frame stays calm and uncluttered so game objects can move over it. Scene: top-down view of an empty black cast-iron frying pan on a gas stove with an oil sheen, wooden counter around it, no egg
Setting/world: a home kitchen stovetop seen from above at a slight angle, wooden counter. Lighting: soft window light from the left, warm kitchen tones.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### egg-landing/hero  ⬜未生成
保存先: `art/egg-landing/hero.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a single fresh brown-shelled egg, slightly cracked, mid-air, high-speed photography
Setting/world: a home kitchen stovetop seen from above at a slight angle, wooden counter. Lighting: soft window light from the left, warm kitchen tones.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### egg-landing/item  ⬜未生成
保存先: `art/egg-landing/item.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a perfect sunny-side-up fried egg with a glossy bright yolk, isolated, top view
Setting/world: a home kitchen stovetop seen from above at a slight angle, wooden counter. Lighting: soft window light from the left, warm kitchen tones.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### egg-landing/result_good  ⬜未生成
保存先: `art/egg-landing/result_good.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a perfectly centered sunny-side-up egg in a cast-iron pan, overhead, glossy yolk, steam
Setting/world: a home kitchen stovetop seen from above at a slight angle, wooden counter. Lighting: soft window light from the left, warm kitchen tones.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

### egg-landing/result_bad  ⬜未生成
保存先: `art/egg-landing/result_bad.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: an egg splattered across a stovetop far from the pan, yolk sliding down the stove, overhead
Setting/world: a home kitchen stovetop seen from above at a slight angle, wooden counter. Lighting: soft window light from the left, warm kitchen tones.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

---
## 歯磨き粉10.0cm  `toothpaste-10cm`
世界観: a white marble bathroom counter, top-down, a precise steel ruler along one edge ／ 光: bright cool bathroom light, soft reflections on marble

### toothpaste-10cm/key  ⬜未生成
保存先: `art/toothpaste-10cm/key.png` ／ 1024x1536 
```
Vertical 2:3 key visual for a mobile game. The hero subject is large (about 60% of the frame), placed slightly below center. Leave the top 25% of the frame calm and uncluttered for a title overlay. Subject: a toothbrush with a perfect ribbon of striped toothpaste next to a steel ruler, macro advertising shot, a toothpaste tube behind it
Setting/world: a white marble bathroom counter, top-down, a precise steel ruler along one edge. Lighting: bright cool bathroom light, soft reflections on marble.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### toothpaste-10cm/bg  ⬜未生成
保存先: `art/toothpaste-10cm/bg.png` ／ 1024x1536 
```
Vertical 2:3 background plate for gameplay. The hero object is NOT present. The central 50% of the frame stays calm and uncluttered so game objects can move over it. Scene: empty white marble bathroom counter seen from above, a steel ruler along the left edge with millimeter ticks but no numbers, no objects
Setting/world: a white marble bathroom counter, top-down, a precise steel ruler along one edge. Lighting: bright cool bathroom light, soft reflections on marble.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### toothpaste-10cm/hero  ⬜未生成
保存先: `art/toothpaste-10cm/hero.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a toothpaste tube, squeezed from the bottom, red and white stripes on the cap but no text, 3/4 angle
Setting/world: a white marble bathroom counter, top-down, a precise steel ruler along one edge. Lighting: bright cool bathroom light, soft reflections on marble.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### toothpaste-10cm/item  ⬜未生成
保存先: `art/toothpaste-10cm/item.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a clean toothbrush with a ribbon of striped toothpaste, side view, no text
Setting/world: a white marble bathroom counter, top-down, a precise steel ruler along one edge. Lighting: bright cool bathroom light, soft reflections on marble.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### toothpaste-10cm/result_good  ⬜未生成
保存先: `art/toothpaste-10cm/result_good.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a toothpaste ribbon exactly the length of a steel ruler on marble, top-down, calm and precise
Setting/world: a white marble bathroom counter, top-down, a precise steel ruler along one edge. Lighting: bright cool bathroom light, soft reflections on marble.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

### toothpaste-10cm/result_bad  ⬜未生成
保存先: `art/toothpaste-10cm/result_bad.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a huge mountain of toothpaste piled over a toothbrush in a sink, absurd amount
Setting/world: a white marble bathroom counter, top-down, a precise steel ruler along one edge. Lighting: bright cool bathroom light, soft reflections on marble.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

---
## USBを一発で  `usb-insert`
世界観: a dim desk at night with a laptop, a lamp, macro depth of field ／ 光: cool monitor glow plus a warm desk lamp, dramatic

### usb-insert/key  ⬜未生成
保存先: `art/usb-insert/key.png` ／ 1024x1536 
```
Vertical 2:3 key visual for a mobile game. The hero subject is large (about 60% of the frame), placed slightly below center. Leave the top 25% of the frame calm and uncluttered for a title overlay. Subject: a silver USB-A plug approaching the USB port of a laptop in extreme macro, the metal contacts catching the light, tense mood
Setting/world: a dim desk at night with a laptop, a lamp, macro depth of field. Lighting: cool monitor glow plus a warm desk lamp, dramatic.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### usb-insert/bg  ⬜未生成
保存先: `art/usb-insert/bg.png` ／ 1024x1536 
```
Vertical 2:3 background plate for gameplay. The hero object is NOT present. The central 50% of the frame stays calm and uncluttered so game objects can move over it. Scene: empty dark desk at night, laptop edge on the left with its side ports out of focus, warm lamp bokeh, no USB drive
Setting/world: a dim desk at night with a laptop, a lamp, macro depth of field. Lighting: cool monitor glow plus a warm desk lamp, dramatic.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### usb-insert/hero  ⬜未生成
保存先: `art/usb-insert/hero.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a silver USB flash drive with a black plastic body, USB-A connector facing forward, 3/4 angle, no text
Setting/world: a dim desk at night with a laptop, a lamp, macro depth of field. Lighting: cool monitor glow plus a warm desk lamp, dramatic.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### usb-insert/item  ⬜未生成
保存先: `art/usb-insert/item.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: close-up of a laptop side with a USB-A port, brushed aluminum, port opening clearly visible, front-on, no text
Setting/world: a dim desk at night with a laptop, a lamp, macro depth of field. Lighting: cool monitor glow plus a warm desk lamp, dramatic.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### usb-insert/result_good  ⬜未生成
保存先: `art/usb-insert/result_good.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a USB drive fully inserted into a laptop in a dim room, a tiny green LED glowing, satisfying click moment
Setting/world: a dim desk at night with a laptop, a lamp, macro depth of field. Lighting: cool monitor glow plus a warm desk lamp, dramatic.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

### usb-insert/result_bad  ⬜未生成
保存先: `art/usb-insert/result_bad.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a person's tired face lit by a laptop screen, USB drive held backward in hand, desk lamp glow
Setting/world: a dim desk at night with a laptop, a lamp, macro depth of field. Lighting: cool monitor glow plus a warm desk lamp, dramatic.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

---
## ケチャップ黄金比  `ketchup-pour`
世界観: a diner table with a white plate of French fries, shot from slightly above ／ 光: warm overhead pendant light, glossy highlights on sauce

### ketchup-pour/key  ⬜未生成
保存先: `art/ketchup-pour/key.png` ／ 1024x1536 
```
Vertical 2:3 key visual for a mobile game. The hero subject is large (about 60% of the frame), placed slightly below center. Leave the top 25% of the frame calm and uncluttered for a title overlay. Subject: a plastic ketchup bottle squeezing a thick ribbon of ketchup onto crisp French fries on a white plate, appetizing ad photography, glossy
Setting/world: a diner table with a white plate of French fries, shot from slightly above. Lighting: warm overhead pendant light, glossy highlights on sauce.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### ketchup-pour/bg  ⬜未生成
保存先: `art/ketchup-pour/bg.png` ／ 1024x1536 
```
Vertical 2:3 background plate for gameplay. The hero object is NOT present. The central 50% of the frame stays calm and uncluttered so game objects can move over it. Scene: top-down view of an empty white plate with a pile of crispy French fries on one side and a clean empty area at the center, diner tabletop
Setting/world: a diner table with a white plate of French fries, shot from slightly above. Lighting: warm overhead pendant light, glossy highlights on sauce.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### ketchup-pour/hero  ⬜未生成
保存先: `art/ketchup-pour/hero.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a red plastic squeeze ketchup bottle with a nozzle tip, tilted slightly, 3/4 angle, no label text
Setting/world: a diner table with a white plate of French fries, shot from slightly above. Lighting: warm overhead pendant light, glossy highlights on sauce.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### ketchup-pour/item  ⬜未生成
保存先: `art/ketchup-pour/item.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a small pile of golden crispy French fries, isolated, side-top view
Setting/world: a diner table with a white plate of French fries, shot from slightly above. Lighting: warm overhead pendant light, glossy highlights on sauce.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### ketchup-pour/result_good  ⬜未生成
保存先: `art/ketchup-pour/result_good.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a perfectly proportioned ribbon of ketchup on fries, studio food photograph, calm
Setting/world: a diner table with a white plate of French fries, shot from slightly above. Lighting: warm overhead pendant light, glossy highlights on sauce.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

### ketchup-pour/result_bad  ⬜未生成
保存先: `art/ketchup-pour/result_bad.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a plate drowning in a flood of ketchup spilling over the plate edge, overhead
Setting/world: a diner table with a white plate of French fries, shot from slightly above. Lighting: warm overhead pendant light, glossy highlights on sauce.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

---
## ティッシュ1枚だけ  `tissue-one`
世界観: a calm living room side table, a soft beige wall, a window with sheer curtains ／ 光: diffused soft daylight from the right, very airy

### tissue-one/key  ⬜未生成
保存先: `art/tissue-one/key.png` ／ 1024x1536 
```
Vertical 2:3 key visual for a mobile game. The hero subject is large (about 60% of the frame), placed slightly below center. Leave the top 25% of the frame calm and uncluttered for a title overlay. Subject: a white tissue box on a side table with exactly one tissue sheet rising gracefully from the slot, delicate fabric-like folds, product ad photography
Setting/world: a calm living room side table, a soft beige wall, a window with sheer curtains. Lighting: diffused soft daylight from the right, very airy.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### tissue-one/bg  ⬜未生成
保存先: `art/tissue-one/bg.png` ／ 1024x1536 
```
Vertical 2:3 background plate for gameplay. The hero object is NOT present. The central 50% of the frame stays calm and uncluttered so game objects can move over it. Scene: empty minimal living room side table against a soft beige wall with sheer curtains, a clean empty tabletop, airy
Setting/world: a calm living room side table, a soft beige wall, a window with sheer curtains. Lighting: diffused soft daylight from the right, very airy.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1536 (2:3 vertical).
```

### tissue-one/hero  ⬜未生成
保存先: `art/tissue-one/hero.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a white cube tissue box with an oval slot and a single tissue sheet pulled halfway out, 3/4 angle, no text
Setting/world: a calm living room side table, a soft beige wall, a window with sheer curtains. Lighting: diffused soft daylight from the right, very airy.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### tissue-one/item  ⬜未生成
保存先: `art/tissue-one/item.png` ／ 1024x1024 ／ 透過
```
One single isolated object, fully visible with generous margin, centered, no cropping. Transparent background (alpha PNG). If transparency is not supported, use a pure flat white #FFFFFF background and no floor shadow. Subject: a single white tissue sheet floating, slightly crumpled and translucent, soft light through it
Setting/world: a calm living room side table, a soft beige wall, a window with sheer curtains. Lighting: diffused soft daylight from the right, very airy.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1024x1024 (1:1).
```

### tissue-one/result_good  ⬜未生成
保存先: `art/tissue-one/result_good.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: exactly one tissue sheet lying neatly on a table in a calm room, elegant still life
Setting/world: a calm living room side table, a soft beige wall, a window with sheer curtains. Lighting: diffused soft daylight from the right, very airy.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```

### tissue-one/result_bad  ⬜未生成
保存先: `art/tissue-one/result_bad.png` ／ 1536x1024 
```
Landscape 3:2 photograph of an absurd-but-photorealistic outcome, shot like a serious news photo. Keep the center-left calm for a score overlay. Scene: a snowdrift of tissues erupting out of a tissue box and covering a coffee table and floor
Setting/world: a calm living room side table, a soft beige wall, a window with sheer curtains. Lighting: diffused soft daylight from the right, very airy.
Style: Photorealistic commercial photography, premium advertising quality, 85mm lens, soft natural key light with believable contact shadows, real material textures and specular highlights, shallow depth of field, subtle film grain. Strictly NO text, NO letters, NO numbers, NO logos, NO watermark, NO emoji, NO cartoon, NO illustration, NO sticker or stamp look, NO plastic CGI look.
Output size: 1536x1024 (3:2 landscape).
```
