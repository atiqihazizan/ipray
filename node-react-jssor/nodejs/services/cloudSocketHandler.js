/**
 * Cloud Socket Handler (Skrip Asing)
 * Terima event cloud:* dari cloudClient socket dan trigger dataService + socketServerService.
 * Fail ini TIDAK mengubah mana-mana service sedia ada.
 */

let dataService = null;
let socketServerService = null;
let timeService = null;
let imagesPath = null;
let cloudSocket = null;

function overlayConfigFromBits(bits) {
  const n = typeof bits === 'string' ? parseInt(bits, 10) : bits;
  if (Number.isNaN(n) || n < 0 || n > 7) {
    return { showDate: true, showSmallTime: true, showMarquee: true };
  }
  return {
    showDate: (n & 1) !== 0,
    showSmallTime: (n & 2) !== 0,
    showMarquee: (n & 4) !== 0,
  };
}

function buildScreenFlagsPayload(slidesContent, configContent) {
  const slidesConfig = dataService.parseSlidesConfig(slidesContent || '');
  const config = dataService.parseConfig(configContent || '');
  const slideTypesOrder = (slidesContent || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split('|')[0])
    .filter(Boolean);
  let visibleArray = config.SLIDES_CONFIG?.VISIBLE;
  if (!Array.isArray(visibleArray) || visibleArray.length !== slideTypesOrder.length) {
    visibleArray = slideTypesOrder.map(() => 1);
  }
  if (slideTypesOrder.length > 0) visibleArray[0] = 1;
  slideTypesOrder.forEach((type, i) => {
    if (slidesConfig[type]) slidesConfig[type].hide = !(visibleArray[i] === 1);
  });
  const firstSlideType = slideTypesOrder[0];
  const slidesMarqueeShow = firstSlideType && slidesConfig[firstSlideType]
    ? slidesConfig[firstSlideType].marquee !== false
    : true;
  return { slidesConfig, slidesMarqueeShow };
}

function respond(requestId, success, data, error) {
  if (!cloudSocket || !requestId) return;
  cloudSocket.emit('cloud:response', { requestId, success, data, error: error || undefined });
}

async function broadcastAfterCrud(filename, action, extra = {}) {
  if (!socketServerService) return;

  if (filename === 'takwim') {
    const takwimContent = await dataService.readFile('takwim').catch(() => '');
    const takwim = dataService.getTakwimForApp(takwimContent);
    socketServerService.broadcastTakwimRefresh({ takwimArray: takwim.takwimArray, takwimParsed: takwim.takwimParsed });
  } else if (filename === 'hebahan') {
    const hebahanContent = await dataService.readFile('hebahan').catch(() => '');
    const hebahan = dataService.parseHebahan(hebahanContent);
    socketServerService.broadcastHebahanUpdate(hebahan);
  } else if (filename === 'config' && extra.row) {
    const row = extra.row;
    const key = typeof row === 'string' ? row.split('|')[0] : (row && row.key) || '';
    if (key === 'TAKWIM_ZONE') {
      // skip
    } else if (key?.startsWith('HOME_TITLE') || key === 'HOME_TITLE_VISIBLE') {
      if (key === 'HOME_TITLE_VISIBLE') {
        socketServerService.broadcastDataUpdate('config', { action, reason: 'HOME_TITLE_VISIBLE' });
      } else {
        const configContent = await dataService.readFile('config');
        const parsed = dataService.parseConfig(configContent);
        socketServerService.broadcastHomeTitleUpdate(parsed.HOME_TITLE_CONFIG);
        if (key === 'HOME_TITLE_DURATION_SEC') {
          socketServerService.broadcastDataUpdate('config', { action, reason: 'HOME_TITLE_DURATION_SEC' });
        }
      }
    } else if (key?.startsWith('MARQUEE')) {
      const configContent = await dataService.readFile('config');
      const parsed = dataService.parseConfig(configContent);
      socketServerService.broadcastMarqueeConfigUpdate(parsed.MARQUEE_CONFIG);
    } else if (key === 'OVERLAY_BG_COLOR') {
      const configContent = await dataService.readFile('config');
      const parsed = dataService.parseConfig(configContent);
      socketServerService.broadcastColorConfigUpdate(parsed.COLOR_CONFIG);
    } else if (key === 'KEMATIAN_SHOW' || key === 'LIVESTREAM_SHOW') {
      const bits = typeof row === 'string' ? row.split('|')[1] : (row && row.value);
      const overlayConfig = overlayConfigFromBits(bits);
      if (key === 'KEMATIAN_SHOW') {
        socketServerService.broadcastKematianOverlayUpdate(overlayConfig);
      } else {
        socketServerService.broadcastLivestreamOverlayUpdate(overlayConfig);
      }
    } else {
      socketServerService.broadcastDataUpdate(filename, { action, ...extra });
    }
  } else if (filename === 'slides') {
    socketServerService.broadcastDataUpdate(filename, { action, ...extra });
    const [slidesContent, configContent] = await Promise.all([
      dataService.readFile('slides').catch(() => ''),
      dataService.readFile('config').catch(() => '')
    ]);
    const { slidesConfig, slidesMarqueeShow } = buildScreenFlagsPayload(slidesContent, configContent);
    socketServerService.broadcastScreenFlagsUpdate(slidesConfig, slidesMarqueeShow);
  } else {
    socketServerService.broadcastDataUpdate(filename, { action, ...extra });
  }

  if (socketServerService.broadcastSettingAck) {
    socketServerService.broadcastSettingAck(filename, action, extra);
  }

  // Hantar ke cloud supaya panel setting cloud boleh reload tbody/table
  if (cloudSocket && cloudSocket.connected) {
    cloudSocket.emit('data:updated', { fileName: filename, action, ...extra });
    if (filename === 'hebahan') {
      cloudSocket.emit('hebahan:updated');
    }
    cloudSocket.emit('setting:ack');
    cloudSocket.emit('data:ack');
  }
}

function registerHandlers(socket) {
  cloudSocket = socket;

  socket.on('storage:updated', async (payload) => {
    if (!dataService || !payload) return;
    const { fileName, content } = payload;
    if (!fileName || content === undefined) return;
    try {
      await dataService.writeFile(fileName, content, { skipCloudSync: true });
      console.log('[Cloud] Local file updated from cloud:', fileName);
      // Emit ke kiosk sama seperti bila update dari panel local (nodejs → kiosk)
      await broadcastAfterCrud(fileName, 'file:save', {});
    } catch (err) {
      console.error('[Cloud] storage:updated write failed:', fileName, err.message);
    }
  });

  socket.on('cloud:data:get', async payload => {
    const { fileName, requestId } = payload || {};
    try {
      const content = await dataService.readFile(fileName);
      const parsed = dataService.parseFileContent(fileName, content);
      const columns = dataService.getColumns(fileName);
      respond(requestId, true, { data: parsed, columns });
    } catch (err) {
      respond(requestId, false, null, err.message);
    }
  });

  socket.on('cloud:data:update', async payload => {
    const { fileName, id, row, requestId } = payload || {};
    try {
      let rowPayload = row;
      if (fileName === 'config' && row && typeof row === 'object' && (row.raw == null || row.raw === '') && row.key != null) {
        rowPayload = { ...row, raw: `${row.key}|${row.value ?? ''}` };
      }
      const result = await dataService.updateRow(fileName, parseInt(id), rowPayload);
      await broadcastAfterCrud(fileName, 'row:update', { rowId: parseInt(id), row: rowPayload });

      let updatedRow = null;
      try {
        const content = await dataService.readFile(fileName).catch(() => '');
        if (fileName === 'hebahan') {
          const hebahan = dataService.parseHebahan(content);
          updatedRow = hebahan.find(r => r.id === parseInt(id)) || null;
        } else {
          const parsed = dataService.parseFileContent(fileName, content);
          updatedRow = Array.isArray(parsed) ? parsed.find(r => r.id === parseInt(id)) || null : null;
        }
      } catch (_) {}

      respond(requestId, true, { ...result, row: updatedRow, action: 'update' });
    } catch (err) {
      respond(requestId, false, null, err.message);
    }
  });

  socket.on('cloud:data:insert', async payload => {
    const { fileName, row, position = 'end', requestId } = payload || {};
    try {
      let rowPayload = row;
      if (fileName === 'config' && row && typeof row === 'object' && (row.raw == null || row.raw === '') && row.key != null) {
        rowPayload = `${row.key}|${row.value ?? ''}`;
      }
      const result = await dataService.insertRow(fileName, rowPayload, position);
      await broadcastAfterCrud(fileName, 'row:insert', {});

      let newRow = null;
      try {
        const content = await dataService.readFile(fileName).catch(() => '');
        if (fileName === 'hebahan') {
          const hebahan = dataService.parseHebahan(content);
          newRow = hebahan.length > 0 ? hebahan[hebahan.length - 1] : null;
        } else {
          const parsed = dataService.parseFileContent(fileName, content);
          newRow = Array.isArray(parsed) && parsed.length > 0 ? parsed[parsed.length - 1] : null;
        }
      } catch (_) {}

      respond(requestId, true, { ...result, row: newRow, action: 'insert' });
    } catch (err) {
      respond(requestId, false, null, err.message);
    }
  });

  socket.on('cloud:data:delete', async payload => {
    const { fileName, id, requestId } = payload || {};
    try {
      const result = await dataService.deleteRow(fileName, parseInt(id), { imagesPath });
      await broadcastAfterCrud(fileName, 'row:delete', { rowId: parseInt(id) });
      respond(requestId, true, { ...result, rowId: parseInt(id), action: 'delete' });
    } catch (err) {
      respond(requestId, false, null, err.message);
    }
  });

  socket.on('cloud:file:save', async payload => {
    const { fileName, content, requestId } = payload || {};
    try {
      const result = await dataService.writeFile(fileName, content);
      await broadcastAfterCrud(fileName, 'file:save', {});
      respond(requestId, true, result);
    } catch (err) {
      respond(requestId, false, null, err.message);
    }
  });

  socket.on('cloud:file:get', async payload => {
    const { fileName, requestId } = payload || {};
    try {
      const content = await dataService.readFile(fileName);
      respond(requestId, true, { filename: `${fileName}.txt`, content });
    } catch (err) {
      respond(requestId, false, null, err.message);
    }
  });

  socket.on('cloud:image:upload', async payload => {
    const { base64, originalName, category, requestId } = payload || {};
    try {
      const buffer = Buffer.from(base64, 'base64');
      const saved = await dataService.saveUploadedImage({
        buffer,
        originalName,
        category: category || 'penceramah',
        imagesPath
      });
      socketServerService.broadcastDataUpdate('images', { action: 'image:upload', path: saved.path, category: saved.category });
      respond(requestId, true, { success: true, path: saved.path, filename: saved.filename, category: saved.category });
    } catch (err) {
      respond(requestId, false, null, err.message);
    }
  });

  socket.on('cloud:slideshow:reorder', async payload => {
    const { orderedIds, requestId } = payload || {};
    try {
      const result = await dataService.reorderRows('slideshow', orderedIds);
      socketServerService.broadcastDataUpdate('slideshow', { action: 'reorder' });
      respond(requestId, true, result);
    } catch (err) {
      respond(requestId, false, null, err.message);
    }
  });

  socket.on('cloud:slides:toggle-hide', async payload => {
    const { id, requestId } = payload || {};
    try {
      const rowId = parseInt(id);
      const index = rowId - 1;
      if (index === 0) {
        respond(requestId, true, { success: true, hide: false });
        return;
      }
      const [slidesContent, configContent] = await Promise.all([
        dataService.readFile('slides').catch(() => ''),
        dataService.readFile('config').catch(() => '')
      ]);
      const slideTypesOrder = (slidesContent || '')
        .split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
        .map(l => l.split('|')[0]).filter(Boolean);
      const config = dataService.parseConfig(configContent);
      let visibleArray = config.SLIDES_CONFIG?.VISIBLE;
      if (!Array.isArray(visibleArray) || visibleArray.length !== slideTypesOrder.length) {
        visibleArray = slideTypesOrder.map(() => 1);
      }
      visibleArray[0] = 1;
      const wasHidden = visibleArray[index] !== 1;
      visibleArray[index] = wasHidden ? 1 : 0;
      const value = '[' + visibleArray.join(',') + ']';
      const configParsed = dataService.parseFileContent('config', configContent);
      const slidesVisibleRow = configParsed.find(r => r.key === 'SLIDES_VISIBLE');
      const formattedRow = `SLIDES_VISIBLE|${value}`;
      if (slidesVisibleRow && slidesVisibleRow.id) {
        await dataService.updateRow('config', slidesVisibleRow.id, formattedRow);
        socketServerService.broadcastDataUpdate('config', { action: 'row:update', rowId: slidesVisibleRow.id, row: formattedRow });
      } else {
        await dataService.insertRow('config', formattedRow, 'end');
        socketServerService.broadcastDataUpdate('config', { action: 'row:insert' });
      }
      respond(requestId, true, { success: true, hide: !wasHidden });
    } catch (err) {
      respond(requestId, false, null, err.message);
    }
  });

  socket.on('cloud:kematian:update', data => {
    if (!socketServerService) return;
    const io = socketServerService.getIO();
    const payload = { ...data, active: true, timestamp: Date.now() };
    if (typeof socketServerService.setKematianAnnouncement === 'function') {
      socketServerService.setKematianAnnouncement(payload);
    } else {
      socketServerService.deathAnnouncementData = payload;
      if (io) io.emit('kematian:updated', payload);
      socket.emit('kematian:updated', payload);
    }
  });

  socket.on('cloud:kematian:clear', () => {
    if (!socketServerService) return;
    const io = socketServerService.getIO();
    if (typeof socketServerService.clearKematianAnnouncement === 'function') {
      socketServerService.clearKematianAnnouncement();
    } else {
      socketServerService.deathAnnouncementData = null;
      const payload = { timestamp: Date.now() };
      if (io) io.emit('kematian:cleared', payload);
      socket.emit('kematian:cleared', payload);
    }
  });

  // Panel cloud (Flutter/web) minta snapshot status kematian semasa.
  // Nodejs akan jawab dengan emit kematian:updated (jika aktif) atau kematian:cleared.
  socket.on('cloud:kematian:status', () => {
    try {
      const deathData = socketServerService?.deathAnnouncementData;
      if (deathData) {
        socket.emit('kematian:updated', { ...deathData, active: true, timestamp: Date.now() });
      } else {
        socket.emit('kematian:cleared', { timestamp: Date.now() });
      }
    } catch (_) {}
  });

  socket.on('cloud:live:start', data => {
    if (!socketServerService) return;
    if (typeof socketServerService.startLiveStream === 'function') {
      socketServerService.startLiveStream(data);
      return;
    }
    const io = socketServerService.getIO();
    if (io) io.emit('live:started', { ...data, active: true, timestamp: Date.now() });
  });

  socket.on('cloud:live:stop', () => {
    if (!socketServerService) return;
    if (typeof socketServerService.stopLiveStream === 'function') {
      socketServerService.stopLiveStream();
      return;
    }
    const io = socketServerService.getIO();
    if (io) io.emit('live:stopped', { timestamp: Date.now() });
  });

  // Panel cloud (Flutter/web) minta snapshot status live semasa.
  // Nodejs akan jawab dengan emit live:started atau live:stopped ke cloud,
  // dan cloud akan forward ke room setting_{clientId}.
  socket.on('cloud:live:status', () => {
    try {
      const liveData = socketServerService?.liveStreamData;
      if (liveData) {
        socket.emit('live:started', { ...liveData, timestamp: Date.now() });
      } else {
        socket.emit('live:stopped', { timestamp: Date.now() });
      }
    } catch (_) {}
  });

  socket.on('cloud:reboot', () => {
    if (!socketServerService) return;
    socketServerService.broadcastSystemReboot();
  });

  socket.on('cloud:test-sound', () => {
    if (!socketServerService) return;
    const io = socketServerService.getIO();
    if (io) io.emit('test-sound', { timestamp: Date.now() });
  });

  socket.on('cloud:time:set', async payload => {
    const { dateTime, requestId } = payload || {};
    try {
      if (!timeService) throw new Error('Time service not available');
      const ts = new Date(dateTime.trim()).getTime();
      if (Number.isNaN(ts)) throw new Error('Invalid dateTime format');
      const ok = timeService.setSystemClock(ts);
      if (!ok) throw new Error('Failed to set system clock');
      socketServerService.broadcastEvent('time-system-updated', { success: true });
      respond(requestId, true, { success: true, message: 'System clock updated' });
    } catch (err) {
      respond(requestId, false, null, err.message);
    }
  });

  socket.on('cloud:time:sync', async payload => {
    const { requestId } = payload || {};
    try {
      if (!timeService) throw new Error('Time service not available');
      const result = await timeService.syncNtp();
      socketServerService.broadcastEvent('time-offset-updated', result);
      respond(requestId, true, result);
    } catch (err) {
      respond(requestId, false, null, err.message);
    }
  });

  socket.on('cloud:wifi:scan', async payload => {
    const { requestId } = payload || {};
    respond(requestId, false, null, 'WiFi scan hanya tersedia dari setting panel local');
  });

  socket.on('cloud:wifi:status', async payload => {
    const { requestId } = payload || {};
    respond(requestId, false, null, 'WiFi status hanya tersedia dari setting panel local');
  });

  socket.on('cloud:wifi:configure', async payload => {
    const { requestId } = payload || {};
    respond(requestId, false, null, 'WiFi configure hanya tersedia dari setting panel local');
  });

  socket.on('cloud:wifi:hotspot:enable', async payload => {
    const { requestId } = payload || {};
    respond(requestId, false, null, 'Hotspot hanya tersedia dari setting panel local');
  });

  socket.on('cloud:wifi:hotspot:disable', async payload => {
    const { requestId } = payload || {};
    respond(requestId, false, null, 'Hotspot hanya tersedia dari setting panel local');
  });

  socket.on('cloud:wifi:hotspot:status', async payload => {
    const { requestId } = payload || {};
    respond(requestId, false, null, 'Hotspot status hanya tersedia dari setting panel local');
  });

  console.log('[cloudSocketHandler] All cloud:* event handlers registered');
}

function init(config) {
  dataService = config.dataService;
  socketServerService = config.socketServerService;
  timeService = config.timeService || null;
  imagesPath = config.imagesPath || null;

  const { socket } = require('./cloudClient');
  registerHandlers(socket);
}

module.exports = { init };
