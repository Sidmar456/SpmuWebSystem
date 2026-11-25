export function groupRequests(requests = []) {
  const groups = {};

  requests.forEach((request) => {
    // Group items submitted together, not every request from the same user.
    const groupId =
      request.request_group_id !== null &&
      request.request_group_id !== undefined &&
      String(request.request_group_id).trim() !== ""
        ? String(request.request_group_id)
        : `single-${request.id}`;

    if (!groups[groupId]) {
      groups[groupId] = {
        // Keep a real stock_requests.id for the PHP approval endpoint.
        id: Number(request.id),
        group_key: groupId,
        request_group_id: request.request_group_id ?? null,
        user_id: request.user_id,
        user_name: request.user_name || "Unknown user",
        items: [],
        request_ids: [],
        total_amount: 0,
        created_at: request.created_at,
        status: request.status || "PENDING",
        claim_code: request.claim_code || "",
      };
    }

    if (request.id !== undefined && request.id !== null) {
      groups[groupId].request_ids.push(Number(request.id));
    }

    if (!groups[groupId].claim_code && request.claim_code) {
      groups[groupId].claim_code = request.claim_code;
    }

    groups[groupId].items.push({
      id: Number(request.id),
      stock_id: Number(request.stock_id),
      item_name: request.item_name || "Unknown item",
      amount: Number(request.amount) || 0,
      image: request.image || "",
      item_type: request.item_type || "non_returnable",
      expected_return_date: request.expected_return_date || null,
      status: request.status || groups[groupId].status,
    });

    groups[groupId].total_amount += Number(request.amount) || 0;
  });

  return Object.values(groups)
    .map((request) => ({
      ...request,
      request_ids: [...new Set(request.request_ids)],
      item_name:
        request.items.length === 1
          ? request.items[0].item_name
          : `${request.items.length} requested supplies`,
      amount: request.total_amount,
      image: request.items[0]?.image || "",
    }))
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
}