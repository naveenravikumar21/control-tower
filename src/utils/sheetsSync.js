// Google Sheets Sync Service
export const SheetsSync = {
  productsToRows: (products) => products.map(p => {
    const parent = p.parentId ? products.find(pp => pp.id === p.parentId) : null;
    return {
      id: p.id,
      name: p.name || '',
      parentId: p.parentId || '',
      parentName: parent?.name || '',
      description: p.description || '',
      productOwner: p.productOwner || '',
      engineeringOwner: p.engineeringOwner || '',
      nextReleaseDate: p.nextReleaseDate || '',
      productGuide: p.documentation?.productGuide || '',
      releaseNotes: p.documentation?.releaseNotes || '',
      demoScript: p.documentation?.demoScript || '',
      testCases: p.documentation?.testCases || '',
      productionChecklist: p.documentation?.productionChecklist || '',
      updatedAt: p.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    };
  }),

  deploymentsToRows: (deployments, clients, products) => deployments.map(d => ({
    id: d.id,
    clientId: d.clientId || '',
    clientName: clients.find(c => c.id === d.clientId)?.name || '',
    productId: d.productId || '',
    productName: products.find(p => p.id === d.productId)?.name || '',
    status: d.status || '',
    deploymentType: d.deploymentType || 'generic',
    nextDeliveryDate: d.nextDeliveryDate || '',
    notes: d.notes || '',
    updatedAt: d.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
  })),

  clientsToRows: (clients) => clients.map(c => ({
    id: c.id,
    name: c.name || '',
    comments: c.comments || '',
    updatedAt: c.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
  })),

  pushToSheet: async (appsScriptUrl, sheetName, rows) => {
    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'write', sheetName, rows })
      });
      const text = await response.text();
      const data = JSON.parse(text);
      return { success: data.success !== false, count: rows.length, ...data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  pullFromSheet: async (appsScriptUrl, sheetName) => {
    try {
      const response = await fetch(`${appsScriptUrl}?action=read&sheetName=${sheetName}`, {
        method: 'GET',
        redirect: 'follow'
      });
      const text = await response.text();
      const data = JSON.parse(text);
      return { success: data.success !== false, rows: data.rows || [], ...data };
    } catch (e) {
      return { success: false, error: e.message, rows: [] };
    }
  }
};
