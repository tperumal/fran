import { useState, useEffect, useCallback } from 'react'
import supabase from '../lib/supabase'
import useAuth from './useAuth'

/**
 * Generic hook that syncs a list of items with Supabase,
 * falling back to localStorage when Supabase is unavailable.
 *
 * @param {string} table - Supabase table name
 * @param {string} localKey - localStorage key
 * @param {object} opts
 * @param {string} opts.orderBy - column to order by (default: 'created_at')
 * @param {boolean} opts.ascending - order direction (default: false)
 * @param {object} opts.filters - extra eq filters e.g. { week_key: '2026-04-07' }
 * @param {function} opts.toRow - transform local item to DB row (strips client-only fields, adds profile_id)
 * @param {function} opts.fromRow - transform DB row to local item shape
 */
export default function useStore(table, localKey, opts = {}) {
  const { user } = useAuth()
  const {
    orderBy = 'created_at',
    ascending = false,
    filters = {},
    toRow = x => x,
    fromRow = x => x,
  } = opts

  const isOnline = !!supabase && !!user

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  // Load
  useEffect(() => {
    if (isOnline) {
      fetchItems()
    } else {
      // localStorage fallback
      try {
        const raw = localStorage.getItem(localKey)
        if (raw) setItems(JSON.parse(raw))
      } catch { /* ignore */ }
      setLoading(false)
    }
  }, [isOnline, table, JSON.stringify(filters)])

  async function fetchItems() {
    setLoading(true)
    let query = supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending })

    // Apply profile filter
    query = query.eq('profile_id', user.id)

    // Apply extra filters
    for (const [col, val] of Object.entries(filters)) {
      query = query.eq(col, val)
    }

    const { data, error } = await query
    if (error) {
      console.error(`[FRAN] Error fetching ${table}:`, error.message)
    } else {
      setItems((data || []).map(fromRow))
    }
    setLoading(false)
  }

  // Save to localStorage (fallback mode)
  function saveLocal(newItems) {
    localStorage.setItem(localKey, JSON.stringify(newItems))
  }

  const addItem = useCallback(async (item) => {
    if (isOnline) {
      const row = toRow(item)
      row.profile_id = user.id
      const { data, error } = await supabase
        .from(table)
        .insert(row)
        .select()
        .single()
      if (error) {
        console.error(`[FRAN] Error inserting ${table}:`, error.message)
        return null
      }
      const mapped = fromRow(data)
      setItems(prev => [mapped, ...prev])
      return mapped
    } else {
      const newItems = [item, ...items]
      setItems(newItems)
      saveLocal(newItems)
      return item
    }
  }, [isOnline, items, table, user])

  const updateItem = useCallback(async (id, changes) => {
    if (isOnline) {
      const { error } = await supabase
        .from(table)
        .update(changes)
        .eq('id', id)
      if (error) {
        console.error(`[FRAN] Error updating ${table}:`, error.message)
        return
      }
    }
    setItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, ...changes } : item
      )
      if (!isOnline) saveLocal(updated)
      return updated
    })
  }, [isOnline, table])

  const deleteItem = useCallback(async (id) => {
    if (isOnline) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
      if (error) {
        console.error(`[FRAN] Error deleting ${table}:`, error.message)
        return
      }
    }
    setItems(prev => {
      const filtered = prev.filter(item => item.id !== id)
      if (!isOnline) saveLocal(filtered)
      return filtered
    })
  }, [isOnline, table])

  const setItemsManual = useCallback((updater) => {
    setItems(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (!isOnline) saveLocal(next)
      return next
    })
  }, [isOnline])

  return {
    items,
    setItems: setItemsManual,
    loading,
    addItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
    isOnline,
  }
}
