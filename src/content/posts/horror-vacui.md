---
title: "Horror Vacui vs. Simplicity"
description: "meta description"
date: 2025-07-30T14:11:47+06:00
image: "/images/posts/nowy_interfejs_bpa.jpg"
draft: false
authors: ["Jaroslaw Solecki"]
tags: ["internet archive", "3D", "webGL","webXR", "metaverse", "Blue Point Art Archive", "documentation"]
categories: ["AR/XR", "heritage", "educational", "Exhibition"]
---
Things are never quite simple when you’re working with IPFS, but I finally have full control of the gallery site again. I’ve stripped the site code right back—realising I’d been relying too much on “intelligence”. The thing about intelligence is that it has a habit of following “horror vacui”—a fear of empty space, always wanting to fill every gap. But as usual, the simplest solutions are the best.

There’s another update: I’ve changed my approach to the Gallery Archive. The 'metaverse' version is on hold for now. Doing this alone meant the coding and testing took nearly a year and put everything else on pause. Now I’m building a new interface. It uses config files on IPFS to build each exhibition with moduless, and different modules mean I can add all sorts of projects—not just exhibitions, but things like 'Milkmaid’s Pitcher' or immersive documentation such as the 'Bednarczyk' space.

<video width="100%" controls loop autoPlay muted>
  <source
    src="/media/ipfs/horror-vacui.mp4"
    type="video/mp4"
  />
  Your browser does not support the video tag.
</video>

Some projects have already moved to the new archive—there’s a test version [View the test version of the new archive](https://archive.bluepointart.uk/). First, I’ll bring over all our traditional exhibitions. Next, I’ll add VR viewing to the interface, and XR features will come later. For now, we’re limited to Android, as Apple is still blocking webXR immersive sessions.

The next step is linking the archive with a wallet (like MetaMask), as exhibition config files will be turned into NFTs. I’m still working out how to use IPFS hosting for free. The loop is tightening and everything’s getting more expensive—even Web3.
