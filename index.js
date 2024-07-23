addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const mcVersionInput = url.searchParams.get('version') || 'latest'
  const versionType = url.searchParams.get('type') || 'release'
  const mod = url.searchParams.get('mod')

  try {
    const versionInfo = await getVersionInfo(mcVersionInput, versionType)
    if (!versionInfo) {
      return new Response('Version not found', { status: 404 })
    }

    if (mod) {
      return await handleModDownload(versionInfo, mod)
    } else {
      return await downloadVanillaMinecraft(versionInfo)
    }
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}

async function getVersionInfo(mcVersionInput, versionType) {
  const versionManifestUrl = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'
  const versionManifest = await fetch(versionManifestUrl).then(res => res.json())

  if (mcVersionInput === 'latest') {
    switch (versionType) {
      case 'release':
        return versionManifest.versions.find(v => v.id === versionManifest.latest.release)
      case 'snapshot':
        return versionManifest.versions.find(v => v.id === versionManifest.latest.snapshot)
      default:
        return versionManifest.versions[0]
    }
  } else {
    let versionInfo = versionManifest.versions.find(v => 
      v.id === mcVersionInput || v.id.startsWith(mcVersionInput)
    )
    
    if (!versionInfo) {
      if (mcVersionInput.toLowerCase() === 'april_fools') {
        versionInfo = versionManifest.versions.find(v => v.id.includes('April Fools'))
      } else if (mcVersionInput.toLowerCase() === 'ancient') {
        versionInfo = versionManifest.versions.find(v => v.type === 'old_alpha' || v.type === 'old_beta')
      }
    }
    
    return versionInfo
  }
}

async function downloadVanillaMinecraft(versionInfo) {
  const versionDetailUrl = versionInfo.url
  const versionDetail = await fetch(versionDetailUrl).then(res => res.json())
  const clientJarUrl = versionDetail.downloads.client.url
  const jarResponse = await fetch(clientJarUrl)
  
  const headers = new Headers(jarResponse.headers)
  headers.set('Content-Disposition', `attachment; filename="minecraft-${versionInfo.id}.jar"`)
  
  return new Response(jarResponse.body, { status: 200, headers: headers })
}

async function handleModDownload(versionInfo, mod) {
  switch (mod.toLowerCase()) {
    case 'optifine':
      return await downloadOptiFine(versionInfo)
    case 'forge':
      return await downloadForge(versionInfo)
    case 'neoforge':
      return await downloadNeoForge(versionInfo)
    case 'fabric':
      return await downloadFabric(versionInfo)
    case 'liteloader':
      return await downloadLiteLoader(versionInfo)
    default:
      return new Response('Unsupported mod type', { status: 400 })
  }
}

async function downloadOptiFine(versionInfo) {
  const optifineApiUrl = `https://optifine.net/adloadx?f=OptiFine_${versionInfo.id}.jar`;
  const response = await fetch(optifineApiUrl);
  const html = await response.text();
  
  const downloadLinkMatch = html.match(/href='(.*?)' onclick/);
  if (downloadLinkMatch) {
    const downloadUrl = 'https://optifine.net/' + downloadLinkMatch[1];
    const jarResponse = await fetch(downloadUrl);
    const headers = new Headers(jarResponse.headers);
    headers.set('Content-Disposition', `attachment; filename="OptiFine_${versionInfo.id}.jar"`);
    return new Response(jarResponse.body, { status: 200, headers: headers });
  } else {
    return new Response('OptiFine download link not found', { status: 404 });
  }
}

async function downloadForge(versionInfo) {
  const forgeApiUrl = `https://files.minecraftforge.net/maven/net/minecraftforge/forge/index_${versionInfo.id}.html`;
  const response = await fetch(forgeApiUrl);
  const html = await response.text();
  
  const downloadLinkMatch = html.match(/data-clipboard-text="(https:\/\/adfoc\.us\/serve\/sitelinks\/.*?)"/);
  if (downloadLinkMatch) {
    const adFocusUrl = downloadLinkMatch[1];
    const adFocusResponse = await fetch(adFocusUrl);
    const finalUrl = adFocusResponse.url;
    const jarResponse = await fetch(finalUrl);
    const headers = new Headers(jarResponse.headers);
    headers.set('Content-Disposition', `attachment; filename="forge-${versionInfo.id}-installer.jar"`);
    return new Response(jarResponse.body, { status: 200, headers: headers });
  } else {
    return new Response('Forge download link not found', { status: 404 });
  }
}

async function downloadNeoForge(versionInfo) {
  const neoForgeApiUrl = 'https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge';
  const response = await fetch(neoForgeApiUrl);
  const versions = await response.json();
  
  const compatibleVersion = versions.find(v => v.startsWith(versionInfo.id));
  if (compatibleVersion) {
    const downloadUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${compatibleVersion}/neoforge-${compatibleVersion}-installer.jar`;
    const jarResponse = await fetch(downloadUrl);
    const headers = new Headers(jarResponse.headers);
    headers.set('Content-Disposition', `attachment; filename="neoforge-${compatibleVersion}-installer.jar"`);
    return new Response(jarResponse.body, { status: 200, headers: headers });
  } else {
    return new Response('NeoForge version not found', { status: 404 });
  }
}

async function downloadLiteLoader(versionInfo) {
  const liteLoaderApiUrl = 'http://dl.liteloader.com/versions/versions.json';
  const response = await fetch(liteLoaderApiUrl);
  const versions = await response.json();
  
  const mcVersion = versions.mcVersions[versionInfo.id];
  if (mcVersion && mcVersion.latest) {
    const artefact = mcVersion.latest.artefact;
    const downloadUrl = `http://dl.liteloader.com/versions/${versionInfo.id}/${artefact.version}/${artefact.file}`;
    const jarResponse = await fetch(downloadUrl);
    const headers = new Headers(jarResponse.headers);
    headers.set('Content-Disposition', `attachment; filename="liteloader-${versionInfo.id}-${artefact.version}.jar"`);
    return new Response(jarResponse.body, { status: 200, headers: headers });
  } else {
    return new Response('LiteLoader version not found', { status: 404 });
  }
}
