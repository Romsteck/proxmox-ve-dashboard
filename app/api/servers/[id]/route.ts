import { NextRequest, NextResponse } from 'next/server';
import { mongoServerService } from '@/lib/services/mongoServerService';

/**
 * DELETE /api/servers/[id] - Supprime un serveur par ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[DEBUG ROUTE] DELETE /api/servers/[id] appelée avec params:', params);

  try {
    const id = params.id;
    console.log('[DEBUG ROUTE] ID extrait des paramètres:', { id, type: typeof id, length: id?.length });

    if (!id) {
      console.log('[DEBUG ROUTE] ID manquant, retour 400');
      return NextResponse.json(
        { error: "ID du serveur manquant dans l'URL" },
        { status: 400 }
      );
    }

    console.log('[DEBUG ROUTE] Appel de deleteServer avec:', { id });
    const deleted = await mongoServerService.deleteServer(id);

    console.log('[DEBUG ROUTE] Résultat de deleteServer:', { deleted });

    if (deleted) {
      console.log('[DEBUG ROUTE] Serveur supprimé avec succès, retour 200');
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      console.log('[DEBUG ROUTE] Aucun serveur trouvé avec cet ID, retour 404');
      return NextResponse.json(
        { error: "Aucun serveur trouvé avec cet ID" },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Échec de la suppression du serveur", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/servers/[id] - Modifie un serveur par ID
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[DEBUG ROUTE] PUT /api/servers/[id] appelée avec params:', params);

  try {
    const id = params.id;
    const updateData = await req.json();

    console.log('[DEBUG ROUTE] ID et données de mise à jour:', {
      id,
      type: typeof id,
      length: id?.length,
      updateData,
      updateDataKeys: Object.keys(updateData || {})
    });

    if (!id) {
      console.log('[DEBUG ROUTE] ID manquant, retour 400');
      return NextResponse.json(
        { error: "ID du serveur manquant dans l'URL" },
        { status: 400 }
      );
    }
    if (Object.keys(updateData).length === 0) {
      console.log('[DEBUG ROUTE] Aucune donnée de mise à jour fournie, retour 400');
      return NextResponse.json(
        { error: "Aucune donnée de mise à jour fournie" },
        { status: 400 }
      );
    }

    console.log('[DEBUG ROUTE] Appel de updateServer avec:', { id, updateData });
    const updatedServer = await mongoServerService.updateServer(id, updateData);

    console.log('[DEBUG ROUTE] Résultat de updateServer:', {
      updatedServer: !!updatedServer,
      serverId: updatedServer?._id,
      serverHost: updatedServer?.host
    });

    if (updatedServer) {
      console.log('[DEBUG ROUTE] Serveur mis à jour avec succès, retour 200');
      return NextResponse.json({ server: updatedServer }, { status: 200 });
    } else {
      console.log('[DEBUG ROUTE] Aucun serveur trouvé avec cet ID, retour 404');
      return NextResponse.json(
        { error: "Aucun serveur trouvé avec cet ID" },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Échec de la modification du serveur", details: (error as Error).message },
      { status: 500 }
    );
  }
}

    console.log('[DEBUG ROUTE] Appel de deleteServer avec:', { id });
    const deleted = await mongoServerService.deleteServer(id);

    console.log('[DEBUG ROUTE] Résultat de deleteServer:', { deleted });

    if (deleted) {
      console.log('[DEBUG ROUTE] Serveur supprimé avec succès, retour 200');
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      console.log('[DEBUG ROUTE] Aucun serveur trouvé avec cet ID, retour 404');
      return NextResponse.json(
        { error: "Aucun serveur trouvé avec cet ID" },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Échec de la suppression du serveur", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/servers/[id] - Modifie un serveur par ID
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[DEBUG ROUTE] PUT /api/servers/[id] appelée avec params:', params);

  try {
    const id = params.id;
    const updateData = await req.json();

    console.log('[DEBUG ROUTE] ID et données de mise à jour:', {
      id,
      type: typeof id,
      length: id?.length,
      updateData,
      updateDataKeys: Object.keys(updateData || {})
    });

    if (!id) {
      console.log('[DEBUG ROUTE] ID manquant, retour 400');
      return NextResponse.json(
        { error: "ID du serveur manquant dans l'URL" },
        { status: 400 }
      );
    }
    if (Object.keys(updateData).length === 0) {
      console.log('[DEBUG ROUTE] Aucune donnée de mise à jour fournie, retour 400');
      return NextResponse.json(
        { error: "Aucune donnée de mise à jour fournie" },
        { status: 400 }
      );
    }

    console.log('[DEBUG ROUTE] Appel de updateServer avec:', { id, updateData });
    const updatedServer = await mongoServerService.updateServer(id, updateData);

    console.log('[DEBUG ROUTE] Résultat de updateServer:', {
      updatedServer: !!updatedServer,
      serverId: updatedServer?._id,
      serverHost: updatedServer?.host
    });

    if (updatedServer) {
      console.log('[DEBUG ROUTE] Serveur mis à jour avec succès, retour 200');
      return NextResponse.json({ server: updatedServer }, { status: 200 });
    } else {
      console.log('[DEBUG ROUTE] Aucun serveur trouvé avec cet ID, retour 404');
      return NextResponse.json(
        { error: "Aucun serveur trouvé avec cet ID" },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Échec de la modification du serveur", details: (error as Error).message },
      { status: 500 }
    );
  }
}