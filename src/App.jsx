import { useState, useRef, useEffect } from 'react'
import './App.css'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import {
  ReactFlow,
  useNodesState,
  Background,
  Controls,
  ViewportPortal,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import EquipmentNode from './components/EquipmentNode'
import gnaPlantLogo from './assets/gna-plant-logo.png'

import mandibulaImg from './equipment-images/Mandibula M.PNG'
import coneGAImg from './equipment-images/coneGA.PNG'
import coneHImg from './equipment-images/coneH.PNG'
import peneiraImg from './equipment-images/peneira.PNG'
import alimentadorImg from './equipment-images/Alimentador.PNG'
import calhaImg from './equipment-images/calha.PNG'
import escalperImg from './equipment-images/escalper.PNG'
import britadorRolosImg from './equipment-images/BritadorRolos.PNG'
import pilhaPulmaoImg from './equipment-images/pilhaPulmao.png'
import pilhaProdutoImg from './equipment-images/pilhaProduto.png'
import pilhaAlimentacaoImg from './equipment-images/pilhaAlimentacao.png'

const initialNodes = []

const nodeTypes = {
  equipment: EquipmentNode,
}

function buildUniqueId(prefix, counter) {
  return `${prefix}-${Date.now()}-${counter}`
}

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [selectedNode, setSelectedNode] = useState(null)
  const [copiedNode, setCopiedNode] = useState(null)
  const [connections, setConnections] = useState([])
  const [selectedConnectionId, setSelectedConnectionId] = useState(null)
  const [activeConnection, setActiveConnection] = useState(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [canvasVersion, setCanvasVersion] = useState(0)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [openSidebarMenu, setOpenSidebarMenu] = useState(null)
  const [isExporting, setIsExporting] = useState(false)
  const [currentScreen, setCurrentScreen] = useState('cover')

  const canvasRef = useRef(null)
  const coverLoadInputRef = useRef(null)
  const activeConnectionRef = useRef(null)
  const selectedConnectionIdRef = useRef(null)
  const selectedNodeRef = useRef(selectedNode)
  const copiedNodeRef = useRef(copiedNode)
  const nodesRef = useRef(nodes)
  const connectionsRef = useRef(connections)
  const historyStackRef = useRef([])
  const historyIndexRef = useRef(-1)
  const isRestoringHistoryRef = useRef(false)
  const idCounterRef = useRef(0)

  function createUniqueId(prefix) {
  idCounterRef.current += 1
  return buildUniqueId(prefix, idCounterRef.current)
}


  function selectConnection(connectionId) {
  document.activeElement?.blur()
  activeConnectionRef.current = null
  setActiveConnection(null)
  setSelectedNode(null)
  selectedNodeRef.current = null

  selectedConnectionIdRef.current = connectionId

  setSelectedConnectionId(connectionId)
}

  function clearConnectionSelection() {
  selectedConnectionIdRef.current = null
  setSelectedConnectionId(null)
}

  function getConnectionSignature(connection) {
    return JSON.stringify({
      sourceNode: connection.sourceNode,
      sourceHandle: connection.sourceHandle,
      targetNode: connection.targetNode,
      targetHandle: connection.targetHandle,
      targetPoint: connection.targetPoint,
      targetSegmentOrientation: connection.targetSegmentOrientation,
      bends: connection.bends,
    })
  }

  function deleteSelectedConnection() {
    const connectionIdToDelete = selectedConnectionIdRef.current

    if (!connectionIdToDelete) return false

    const selectedConnection = connectionsRef.current.find(
      (connection) => String(connection.id) === String(connectionIdToDelete)
    )

    if (!selectedConnection) {
      clearConnectionSelection()
      return false
    }

    const selectedSignature = getConnectionSignature(selectedConnection)

    const nextConnections = connectionsRef.current.filter((connection) => {
      if (String(connection.id) === String(connectionIdToDelete)) {
        return false
      }

      return getConnectionSignature(connection) !== selectedSignature
    })

    if (nextConnections.length === connectionsRef.current.length) return false

    applyProjectChange(nodesRef.current, nextConnections)

    clearConnectionSelection()
    setSelectedNode(null)
    selectedNodeRef.current = null
    document.activeElement?.blur()

    return true
  }

  function clearCanvas() {
    applyProjectChange([], [])
    setActiveConnection(null)
    activeConnectionRef.current = null
    clearConnectionSelection()
    setSelectedNode(null)
    document.activeElement?.blur()
    setCanvasVersion((current) => current + 1)
  }

  const equipmentImages = {
  jaw: mandibulaImg,
  coneGA: coneGAImg,
  coneH: coneHImg,
  screen: peneiraImg,
  feeder: alimentadorImg,
  chute: calhaImg,
  scalper: escalperImg,
  rollCrusher: britadorRolosImg,
  surgePile: pilhaPulmaoImg,
  productPile: pilhaProdutoImg,
  feedPile: pilhaAlimentacaoImg,
}
  
  function loadProjectFromFile(file, shouldOpenEditor = false) {
    if (!file) return

    const reader = new FileReader()

    reader.onload = (readerEvent) => {
      try {
        const projectData = JSON.parse(readerEvent.target.result)

        const nodeIdMap = {}

        const loadedNodes = (projectData.nodes || []).map((node, index) => {
          const newNodeId = createUniqueId(`loaded-node-${index}`)
          nodeIdMap[node.id] = newNodeId

          return {
            ...node,
            id: newNodeId,
            data: {
  ...node.data,
  image:
    equipmentImages[node.data.equipmentType] ||
    node.data.image,
  descriptionWidth: node.data.descriptionWidth || 120,
              inputFlow: node.data.inputFlow || '',
              bottomOutputFlow: node.data.bottomOutputFlow || '',
              lateralOutputFlow: node.data.lateralOutputFlow || '',
              deckFlows: node.data.deckFlows || {},
              onConnectorClick: handleConnectorClick,
              hasConnectionOnHandle,
            },
          }
        })

        const loadedConnections = (projectData.connections || []).map(
          (connection, index) => ({
            ...connection,
            id: createUniqueId(`loaded-connection-${index}`),
            sourceNode: nodeIdMap[connection.sourceNode] || connection.sourceNode,
            targetNode: connection.targetNode
              ? nodeIdMap[connection.targetNode] || connection.targetNode
              : null,
          })
        )

        applyProjectChange(loadedNodes, loadedConnections)

        setSelectedNode(null)
        clearConnectionSelection()
        setActiveConnection(null)
        activeConnectionRef.current = null
        document.activeElement?.blur()
        setCanvasVersion((current) => current + 1)

        if (shouldOpenEditor) {
          setCurrentScreen('editor')
        }
      } catch (error) {
        console.error('Erro ao carregar projeto:', error)
        alert('Não foi possível carregar o projeto. Verifique se o arquivo JSON é válido.')
      }
    }

    reader.readAsText(file)
  }

  function createNewProject() {
    applyProjectChange([], [])
    setActiveConnection(null)
    activeConnectionRef.current = null
    clearConnectionSelection()
    setSelectedNode(null)
    selectedNodeRef.current = null
    document.activeElement?.blur()
    setCanvasVersion((current) => current + 1)
    setCurrentScreen('editor')
  }

function createProjectSnapshot(
  nodesToSave = nodesRef.current,
  connectionsToSave = connectionsRef.current
) {
  const cleanNodes = nodesToSave.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onConnectorClick: undefined,
      hasConnectionOnHandle: undefined,
    },
  }))

  return JSON.stringify({
    nodes: cleanNodes,
    connections: connectionsToSave,
  })
}

function restoreProjectSnapshot(snapshot) {
  const projectData = JSON.parse(snapshot)

  const restoredNodes = projectData.nodes || []
  const restoredConnections = projectData.connections || []

  isRestoringHistoryRef.current = true

  nodesRef.current = restoredNodes
  connectionsRef.current = restoredConnections

  setNodes(restoredNodes)
  setConnections(restoredConnections)

  setSelectedNode(null)
  clearConnectionSelection()

  setActiveConnection(null)
  activeConnectionRef.current = null

  document.activeElement?.blur()
  isRestoringHistoryRef.current = false
}

function recordHistorySnapshot(
  nodesToSave = nodesRef.current,
  connectionsToSave = connectionsRef.current
) {
  if (isRestoringHistoryRef.current) return

  const snapshot = createProjectSnapshot(nodesToSave, connectionsToSave)
  const currentSnapshot = historyStackRef.current[historyIndexRef.current]

  if (snapshot === currentSnapshot) return

  historyStackRef.current = historyStackRef.current.slice(
    0,
    historyIndexRef.current + 1
  )

  historyStackRef.current.push(snapshot)

  if (historyStackRef.current.length > 80) {
    historyStackRef.current.shift()
  }

  historyIndexRef.current = historyStackRef.current.length - 1
}

function applyProjectChange(nextNodes, nextConnections, shouldRecord = true) {
  nodesRef.current = nextNodes
  connectionsRef.current = nextConnections

  setNodes(nextNodes)
  setConnections(nextConnections)

  if (shouldRecord) {
    recordHistorySnapshot(nextNodes, nextConnections)
  }
}

function updateNodes(updater, shouldRecord = true) {
  const currentNodes = nodesRef.current

  const nextNodes =
    typeof updater === 'function' ? updater(currentNodes) : updater

  nodesRef.current = nextNodes
  setNodes(nextNodes)

  if (shouldRecord) {
    recordHistorySnapshot(nextNodes, connectionsRef.current)
  }
}

function updateConnections(updater, shouldRecord = true) {
  const currentConnections = connectionsRef.current

  const nextConnections =
    typeof updater === 'function'
      ? updater(currentConnections)
      : updater

  connectionsRef.current = nextConnections
  setConnections(nextConnections)

  if (shouldRecord) {
    recordHistorySnapshot(nodesRef.current, nextConnections)
  }
}

function undoProject() {
  if (historyIndexRef.current <= 0) return

  historyIndexRef.current -= 1

  const snapshotToRestore =
    historyStackRef.current[historyIndexRef.current]

  restoreProjectSnapshot(snapshotToRestore)
}

function redoProject() {
  if (
    historyIndexRef.current >=
    historyStackRef.current.length - 1
  ) {
    return
  }

  historyIndexRef.current += 1

  const snapshotToRestore =
    historyStackRef.current[historyIndexRef.current]

  restoreProjectSnapshot(snapshotToRestore)
}

function toggleSidebarMenu(menuName) {
  setOpenSidebarMenu((currentMenu) =>
    currentMenu === menuName ? null : menuName
  )
}

function waitForExportRender() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 80)
      })
    })
  })
}

async function captureExportCanvas() {
  if (!reactFlowInstance || !canvasRef.current) return null

  const currentViewport = reactFlowInstance.getViewport()

  setIsExporting(true)

  try {
    await reactFlowInstance.fitView({
      padding: 0.15,
      duration: 0,
    })

    await waitForExportRender()

    return await html2canvas(canvasRef.current, {
      backgroundColor: 'white',
      scale: 2,
    })
  } finally {
    reactFlowInstance.setViewport(currentViewport)
    setIsExporting(false)
  }
}

useEffect(() => {
  nodesRef.current = nodes
}, [nodes])

useEffect(() => {
  connectionsRef.current = connections
}, [connections])

useEffect(() => {
  selectedNodeRef.current = selectedNode
}, [selectedNode])

useEffect(() => {
  copiedNodeRef.current = copiedNode
}, [copiedNode])

useEffect(() => {
  if (historyIndexRef.current === -1) {
    recordHistorySnapshot(nodesRef.current, connectionsRef.current)
  }
}, [])

  useEffect(() => {
    function handleKeyDown(event) {
      const key = event.key.toLowerCase()

      if (event.ctrlKey && event.shiftKey && key === 'z') {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation?.()
        redoProject()
        return
      }

      if (event.ctrlKey && key === 'z') {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation?.()
        undoProject()
        return
      }

      if (event.ctrlKey && key === 'y') {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation?.()
        redoProject()
        return
      }

      if (event.ctrlKey && key === 'c') {
        if (selectedNodeRef.current) {
          copiedNodeRef.current = selectedNodeRef.current
          setCopiedNode(selectedNodeRef.current)
        }

        return
      }

      if (event.ctrlKey && key === 'v') {
        if (copiedNodeRef.current) {
          const newNode = {
            ...copiedNodeRef.current,
            id: createUniqueId('node'),
            position: {
              x: copiedNodeRef.current.position.x + 40,
              y: copiedNodeRef.current.position.y + 40,
            },
            selected: false,
          }

          updateNodes((currentNodes) => [...currentNodes, newNode])
        }

        return
      }

      if (event.key !== 'Delete') return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation?.()

      if (deleteSelectedConnection()) return

      if (selectedNodeRef.current) {
        const selectedNodeId = selectedNodeRef.current.id

        const nextNodes = nodesRef.current.filter(
          (node) => node.id !== selectedNodeId
        )

        const nextConnections = connectionsRef.current.filter(
          (connection) =>
            connection.sourceNode !== selectedNodeId &&
            connection.targetNode !== selectedNodeId
        )

        applyProjectChange(nextNodes, nextConnections)

        setSelectedNode(null)
        selectedNodeRef.current = null
        clearConnectionSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [])


  function startConnection(nodeId, handleId) {
    clearConnectionSelection()

    const newActiveConnection = {
      sourceNode: nodeId,
      sourceHandle: handleId,
      bends: [],
    }

    activeConnectionRef.current = newActiveConnection
    setActiveConnection(newActiveConnection)
  }

  function finishConnection(nodeId, handleId) {
    const currentConnection = activeConnectionRef.current

    if (!currentConnection) return

    const targetPoint = getHandlePosition(nodeId, handleId)
    let adjustedBends = [...currentConnection.bends]

    if (targetPoint && adjustedBends.length > 0) {
      const lastIndex = adjustedBends.length - 1

      adjustedBends[lastIndex] = {
        ...adjustedBends[lastIndex],
        x: targetPoint.x,
      }
    }

    const newConnection = {
      id: createUniqueId('connection'),
      sourceNode: currentConnection.sourceNode,
      sourceHandle: currentConnection.sourceHandle,
      targetNode: nodeId,
      targetHandle: handleId,
      targetPoint: null,
      targetSegmentOrientation: null,
      bends: adjustedBends,
    }

    updateConnections((currentConnections) => [
      ...currentConnections,
      newConnection,
    ])

    activeConnectionRef.current = null
    setActiveConnection(null)
  }

  function finishConnectionToLine(targetPoint, targetSegmentOrientation) {
    const currentConnection = activeConnectionRef.current

    if (!currentConnection) return

    const newConnection = {
      id: createUniqueId('connection'),
      sourceNode: currentConnection.sourceNode,
      sourceHandle: currentConnection.sourceHandle,
      targetNode: null,
      targetHandle: null,
      targetPoint,
      targetSegmentOrientation,
      bends: currentConnection.bends,
    }

    updateConnections((currentConnections) => [
      ...currentConnections,
      newConnection,
    ])

    activeConnectionRef.current = null
    setActiveConnection(null)
  }

  function handleConnectorClick(nodeId, handleId) {
    const isInput = handleId === 'entrada'

    if (activeConnectionRef.current) {
      if (isInput) {
        finishConnection(nodeId, handleId)
      }

      return
    }

    if (isInput) return

    startConnection(nodeId, handleId)
  }

  function addBendPoint(event) {
    const currentConnection = activeConnectionRef.current

    if (!currentConnection) return
    if (!reactFlowInstance) return

    const clickedPoint = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    const previousPoint =
      currentConnection.bends.length > 0
        ? currentConnection.bends[currentConnection.bends.length - 1]
        : getHandlePosition(
            currentConnection.sourceNode,
            currentConnection.sourceHandle
          )

    let correctedPoint = clickedPoint

    if (previousPoint) {
      const diffX = Math.abs(clickedPoint.x - previousPoint.x)
      const diffY = Math.abs(clickedPoint.y - previousPoint.y)

      if (diffX >= diffY) {
        correctedPoint = {
          x: clickedPoint.x,
          y: previousPoint.y,
        }
      } else {
        correctedPoint = {
          x: previousPoint.x,
          y: clickedPoint.y,
        }
      }
    }

    const updatedConnection = {
      ...currentConnection,
      bends: [...currentConnection.bends, correctedPoint],
    }

    activeConnectionRef.current = updatedConnection
    setActiveConnection(updatedConnection)
  }

  function getHandlePosition(nodeId, handleId) {
    const node = nodes.find((item) => item.id === nodeId)

    if (!node) return null

    const baseX = node.position.x
    const baseY = node.position.y
    const type = node.data.equipmentType

    const dimensionsByType = {
      jaw: { width: 150, height: 120 },
      coneGA: { width: 150, height: 114 },
      coneH: { width: 150, height: 160 },
      screen: { width: 180, height: 95 },
      feeder: { width: 120, height: 71 },
      chute: { width: 120, height: 71 },
      scalper: { width: 140, height: 91 },
      rollCrusher: { width: 145, height: 110 },
      surgePile: { width: 150, height: 120 },
      productPile: { width: 150, height: 120 },
      feedPile: { width: 150, height: 120 },
      standard: { width: 140, height: 110 },
    }

    const dimensions = dimensionsByType[type] || dimensionsByType.standard

    if (handleId === 'entrada') {
      if (type === 'surgePile') {
        return {
          x: baseX + 57,
          y: baseY + 20,
        }
      }

      if (type === 'productPile') {
        return {
          x: baseX + 55,
          y: baseY + 14,
        }
      }

      return {
        x: baseX + dimensions.width / 2,
        y: baseY,
      }
    }

    if (handleId === 'saida-inferior') {
      if (type === 'coneH') {
  return {
    x: baseX + 75,
    y: baseY + 168,
  }
}

      if (type === 'coneGA') {
  return {
    x: baseX + 75,
    y: baseY + 110,
  }
}

      if (type === 'jaw') {
        return {
          x: baseX + dimensions.width / 2,
          y: baseY + dimensions.height - 5,
        }
      }

      if (type === 'screen') {
        return {
          x: baseX + dimensions.width / 2,
          y: baseY + dimensions.height + 13,
        }
      }

      if (type === 'feeder') {
  return {
    x: baseX + 60,
    y: baseY + 83,
  }
}

      if (type === 'chute') {
  return {
    x: baseX + 60,
    y: baseY + 69,
  }
}

      if (type === 'scalper') {
  return {
    x: baseX + 70,
    y: baseY + 98,
  }
}

      if (type === 'rollCrusher') {
        return {
          x: baseX + 72,
          y: baseY + 84,
        }
      }

      if (type === 'surgePile') {
        return {
          x: baseX + 57,
          y: baseY + 81,
        }
      }

      if (type === 'feedPile') {
  return {
    x: baseX + 58,
    y: baseY + 104,
  }
}

      return {
        x: baseX + dimensions.width / 2,
        y: baseY + dimensions.height,
      }
    }

    if (handleId === 'saida-lateral') {
      return {
        x: baseX + dimensions.width,
        y: baseY + 40,
      }
    }

    if (handleId?.startsWith('deck-')) {
      const deckNumber = Number(handleId.replace('deck-', ''))
      const deckIndex = deckNumber - 1

      return {
        x: baseX + dimensions.width,
        y: baseY + 32 + deckIndex * 18,
      }
    }

    return {
      x: baseX + dimensions.width / 2,
      y: baseY + dimensions.height / 2,
    }
  }

  function getConnectionPointObjects(connection) {
    const sourcePoint = getHandlePosition(
      connection.sourceNode,
      connection.sourceHandle
    )

    const targetPoint =
      connection.targetPoint ||
      getHandlePosition(connection.targetNode, connection.targetHandle)

    let bends = [...connection.bends]

    if (targetPoint && bends.length > 0) {
      const lastIndex = bends.length - 1

      if (connection.targetPoint) {
        if (connection.targetSegmentOrientation === 'horizontal') {
          bends[lastIndex] = {
            ...bends[lastIndex],
            x: targetPoint.x,
          }
        }

        if (connection.targetSegmentOrientation === 'vertical') {
          bends[lastIndex] = {
            ...bends[lastIndex],
            y: targetPoint.y,
          }
        }
      } else {
        bends[lastIndex] = {
          ...bends[lastIndex],
          x: targetPoint.x,
        }
      }
    }

    const rawPoints = [
      sourcePoint,
      ...bends,
      targetPoint,
    ].filter(Boolean)

    const orthogonalPoints = []

    rawPoints.forEach((point, index) => {
      if (index === 0) {
        orthogonalPoints.push(point)
        return
      }

      const previousPoint = orthogonalPoints[orthogonalPoints.length - 1]

      const isOrthogonal =
        Math.abs(previousPoint.x - point.x) < 2 ||
        Math.abs(previousPoint.y - point.y) < 2

      if (!isOrthogonal) {
        orthogonalPoints.push({
          x: point.x,
          y: previousPoint.y,
        })
      }

      orthogonalPoints.push(point)
    })

    return orthogonalPoints.filter((point, index) => {
      const previousPoint = orthogonalPoints[index - 1]

      if (!previousPoint) return true

      return (
        Math.abs(point.x - previousPoint.x) > 2 ||
        Math.abs(point.y - previousPoint.y) > 2
      )
    })
  }

  function getConnectionPoints(connection) {
    return getConnectionPointObjects(connection)
      .map((point) => `${point.x},${point.y}`)
      .join(' ')
  }

  function getConnectionSegments(connection) {
    const points = getConnectionPointObjects(connection)
    const segments = []

    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index]
      const end = points[index + 1]

      const isHorizontal =
        Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)

      segments.push({
        id: `${connection.id}-${index}`,
        start,
        end,
        orientation: isHorizontal ? 'horizontal' : 'vertical',
      })
    }

    return segments
  }

  function getConnectionArrowStyle(connection) {
    const points = getConnectionPointObjects(connection)

    if (points.length < 2) return null

    const start = points[points.length - 2]
    const end = points[points.length - 1]
    const dx = end.x - start.x
    const dy = end.y - start.y

    let rotation

    if (Math.abs(dx) >= Math.abs(dy)) {
      rotation = dx >= 0 ? 0 : 180
    } else {
      rotation = dy >= 0 ? 90 : -90
    }

    return {
      left: end.x,
      top: end.y,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    }
  }

  function getClosestPointOnConnection(connection, clickedPoint) {
    const points = getConnectionPointObjects(connection)

    let closest = null

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i]
      const end = points[i + 1]

      const isHorizontal =
        Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)

      let candidatePoint
      let distance

      if (isHorizontal) {
        const minX = Math.min(start.x, end.x)
        const maxX = Math.max(start.x, end.x)

        const snappedX = Math.max(
          minX,
          Math.min(clickedPoint.x, maxX)
        )

        candidatePoint = {
          x: snappedX,
          y: start.y,
        }

        distance = Math.abs(clickedPoint.y - start.y)
      } else {
        const minY = Math.min(start.y, end.y)
        const maxY = Math.max(start.y, end.y)

        const snappedY = Math.max(
          minY,
          Math.min(clickedPoint.y, maxY)
        )

        candidatePoint = {
          x: start.x,
          y: snappedY,
        }

        distance = Math.abs(clickedPoint.x - start.x)
      }

      if (!closest || distance < closest.distance) {
        closest = {
          point: candidatePoint,
          orientation: isHorizontal ? 'horizontal' : 'vertical',
          distance,
        }
      }
    }

    return closest
  }

  function hasConnectionOnHandle(nodeId, handleId) {
    return connections.some(
      (connection) =>
        (connection.sourceNode === nodeId &&
          connection.sourceHandle === handleId) ||
        (connection.targetNode === nodeId &&
          connection.targetHandle === handleId)
    )
  }

  function addNode(label, image, equipmentType = 'standard', decks = 0) {
    const newNode = {
      id: createUniqueId('node'),
      position: {
        x: 250 + nodes.length * 40,
        y: 150 + nodes.length * 40,
      },
      data: {
        label,
        image,
        equipmentType,
        decks,
        description: label,
        descriptionWidth: 120,

        inputFlow: '',
        bottomOutputFlow: '',
        lateralOutputFlow: '',
        deckFlows: {},

        onConnectorClick: handleConnectorClick,
        hasConnectionOnHandle,
      },
      type: 'equipment',
    }

    updateNodes((currentNodes) => [...currentNodes, newNode])
  }

  const nodesWithRuntimeData = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      descriptionWidth: node.data.descriptionWidth || 120,
      inputFlow: node.data.inputFlow || '',
      bottomOutputFlow: node.data.bottomOutputFlow || '',
      lateralOutputFlow: node.data.lateralOutputFlow || '',
      deckFlows: node.data.deckFlows || {},
      onConnectorClick: handleConnectorClick,
      hasConnectionOnHandle,
    },
  }))

  if (currentScreen === 'cover') {
    return (
      <div className="cover-page">
        <div className="cover-content">
          <img
            src={gnaPlantLogo}
            alt="GNA Plant"
            className="cover-logo"
          />

          <div className="cover-actions">
            <button
              className="cover-button cover-button-primary"
              onClick={createNewProject}
            >
              Criar Projeto
            </button>

            <button
              className="cover-button cover-button-secondary"
              onClick={() => {
                coverLoadInputRef.current.value = ''
                coverLoadInputRef.current.click()
              }}
            >
              Carregar Projeto
            </button>
          </div>

          <input
            ref={coverLoadInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files[0]

              loadProjectFromFile(file, true)
              event.target.value = ''
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="sidebar">
  <div className="sidebar-brand">
    <h2>GNA Plant</h2>
    <p>Fluxograma visual de britagem</p>
  </div>

  <div className="project-summary">
    <div>
      <span>{nodes.length}</span>
      <small>equipamentos</small>
    </div>

    <div>
      <span>{connections.length}</span>
      <small>linhas</small>
    </div>
  </div>

  <div className="sidebar-section">
    <h3>Projeto</h3>

    <button
      onClick={() => {
        const projectData = {
          nodes,
          connections,
        }

        const json = JSON.stringify(projectData, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = 'gna-plant-projeto.json'
        link.click()

        URL.revokeObjectURL(url)
      }}
    >
      Salvar projeto
    </button>

    <button
      onClick={() => {
        const input = document.getElementById('load-project-input')
        input.value = ''
        input.click()
      }}
    >
      Carregar projeto
    </button>

    <div className="sidebar-dropdown">
      <button
        className="sidebar-dropdown-button"
        onClick={() => toggleSidebarMenu('export')}
      >
        Exportar ▾
      </button>

      {openSidebarMenu === 'export' && (
        <div className="sidebar-submenu">
          <button
            onClick={async () => {
              const canvas = await captureExportCanvas()

              if (!canvas) return

              const link = document.createElement('a')
              link.download = 'gna-plant.png'
              link.href = canvas.toDataURL('image/png')
              link.click()
            }}
          >
            PNG
          </button>

          <button
            onClick={async () => {
              const canvas = await captureExportCanvas()

              if (!canvas) return

              const imageData = canvas.toDataURL('image/png')

              const pdf = new jsPDF({
                orientation:
                  canvas.width > canvas.height
                    ? 'landscape'
                    : 'portrait',
                unit: 'mm',
                format: 'a4',
              })

              const pageWidth = pdf.internal.pageSize.getWidth()
              const pageHeight = pdf.internal.pageSize.getHeight()

              const ratio = Math.min(
                pageWidth / canvas.width,
                pageHeight / canvas.height
              )

              const imageWidth = canvas.width * ratio
              const imageHeight = canvas.height * ratio

              pdf.addImage(
                imageData,
                'PNG',
                (pageWidth - imageWidth) / 2,
                (pageHeight - imageHeight) / 2,
                imageWidth,
                imageHeight
              )

              pdf.save('gna-plant.pdf')
            }}
          >
            PDF
          </button>
        </div>
      )}
    </div>

    <button
      className="button-danger"
      onClick={() => {
        if (nodes.length === 0 && connections.length === 0) return

        setShowClearConfirm(true)
      }}
    >
      Limpar tela
    </button>

    <input
      id="load-project-input"
      type="file"
      accept=".json"
      style={{ display: 'none' }}
      onChange={(event) => {
        const file = event.target.files[0]

        loadProjectFromFile(file)
        event.target.value = ''
      }}
    />
  </div>

  <div className="sidebar-section">
    <h3>Equipamentos</h3>

    <div className="sidebar-dropdown">
      <button
        className="sidebar-dropdown-button"
        onClick={() => toggleSidebarMenu('crushers')}
      >
        Britadores ▾
      </button>

      {openSidebarMenu === 'crushers' && (
        <div className="sidebar-submenu">
          <button onClick={() => addNode('Britador de Mandíbula', mandibulaImg, 'jaw')}>
            Mandíbula
          </button>

          <button onClick={() => addNode('Britador Cônico GA', coneGAImg, 'coneGA')}>
            Cônico GA
          </button>

          <button onClick={() => addNode('Britador Cônico H', coneHImg, 'coneH')}>
            Cônico H
          </button>

          <button onClick={() => addNode('Britador de Rolos', britadorRolosImg, 'rollCrusher')}>
            Britador de Rolos
          </button>
        </div>
      )}
    </div>

    <div className="sidebar-dropdown">
      <button
        className="sidebar-dropdown-button"
        onClick={() => toggleSidebarMenu('equipment')}
      >
        Equipamentos ▾
      </button>

      {openSidebarMenu === 'equipment' && (
        <div className="sidebar-submenu">
          <button onClick={() => addNode('Alimentador Vibratório', alimentadorImg, 'feeder')}>
            Alimentador
          </button>

          <button onClick={() => addNode('Calha Vibratória', calhaImg, 'chute')}>
            Calha
          </button>

          <button onClick={() => addNode('Peneira Vibratória', peneiraImg, 'screen', 1)}>
            Peneira
          </button>

          <button onClick={() => addNode('Escalper', escalperImg, 'scalper', 1)}>
            Escalper
          </button>
        </div>
      )}
    </div>

    <div className="sidebar-dropdown">
      <button
        className="sidebar-dropdown-button"
        onClick={() => toggleSidebarMenu('piles')}
      >
        Pilhas ▾
      </button>

      {openSidebarMenu === 'piles' && (
        <div className="sidebar-submenu">
          <button onClick={() => addNode('Material', pilhaAlimentacaoImg, 'feedPile')}>
            Alimentação
          </button>

          <button onClick={() => addNode('Pilha Pulmão', pilhaPulmaoImg, 'surgePile')}>
            Pilha Pulmão
          </button>

          <button onClick={() => addNode('Pilha de Produto', pilhaProdutoImg, 'productPile')}>
            Pilha Produto
          </button>
        </div>
      )}
    </div>
  </div>
</div>

      <div
        ref={canvasRef}
        className={`canvas${isExporting ? ' canvas-exporting' : ''}`}
        onClick={(event) => {
          addBendPoint(event)
        }}
      >
        <ReactFlow
  key={canvasVersion}
  nodes={nodesWithRuntimeData}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          minZoom={0.05}
maxZoom={2}
deleteKeyCode={null}
          onNodeDoubleClick={(event, node) => {
            clearConnectionSelection()
            selectedNodeRef.current = node
            setSelectedNode(node)
          }}
          onNodeClick={(event, node) => {
            clearConnectionSelection()
            selectedNodeRef.current = node
            setSelectedNode(node)
          }}
          onPaneClick={() => {
            clearConnectionSelection()
          }}
          onInit={(instance) => {
            setReactFlowInstance(instance)
          }}
          fitView
          autoPanOnNodeDrag={false}
        >
          <Background color="#d7dde5" gap={24} />
          <Controls />

          <ViewportPortal>
            {isExporting && (
              <div className="export-lines">
                {connections.map((connection) => (
                  <div key={`export-${connection.id}`}>
                    {getConnectionSegments(connection).map((segment) => {
                      const isHorizontal =
                        segment.orientation === 'horizontal'

                      return (
                        <div
                          key={segment.id}
                          className={`export-line-segment export-line-${segment.orientation}`}
                          style={{
                            left: isHorizontal
                              ? Math.min(segment.start.x, segment.end.x)
                              : segment.start.x - 2,
                            top: isHorizontal
                              ? segment.start.y - 2
                              : Math.min(segment.start.y, segment.end.y),
                            width: isHorizontal
                              ? Math.abs(segment.end.x - segment.start.x)
                              : 4,
                            height: isHorizontal
                              ? 4
                              : Math.abs(segment.end.y - segment.start.y),
                          }}
                        />
                      )
                    })}

                    {getConnectionArrowStyle(connection) && (
                      <div
                        className="export-line-arrow"
                        style={getConnectionArrowStyle(connection)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {connections.map((connection) => (
              <svg
                key={connection.id}
                className="temporary-line"
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <marker
                    id={`arrow-${connection.id}`}
                    markerWidth="3"
                    markerHeight="3"
                    refX="3"
                    refY="1.5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path
                      d="M0,0 L0,3 L3,1.5 z"
                      fill={
                        selectedConnectionId === connection.id
                          ? 'orange'
                          : 'blue'
                      }
                    />
                  </marker>
                </defs>

                <polyline
                  points={getConnectionPoints(connection)}
                  fill="none"
                  stroke={
                    selectedConnectionId === connection.id
                      ? 'orange'
                      : 'blue'
                  }
                  strokeWidth="4"
                  markerEnd={`url(#arrow-${connection.id})`}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()

                    if (activeConnectionRef.current && reactFlowInstance) {
                      const clickedPoint =
                        reactFlowInstance.screenToFlowPosition({
                          x: event.clientX,
                          y: event.clientY,
                        })

                      const closest = getClosestPointOnConnection(
                        connection,
                        clickedPoint
                      )

                      if (closest) {
                        finishConnectionToLine(
                          closest.point,
                          closest.orientation
                        )
                      }

                      return
                    }

                    selectConnection(connection.id)
                  }}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                  style={{
                    cursor: 'pointer',
                  }}
                />
              </svg>
            ))}

            {activeConnection?.bends.length > 0 && (
              <svg
                className="temporary-line"
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polyline
                  points={[
                    getHandlePosition(
                      activeConnection.sourceNode,
                      activeConnection.sourceHandle
                    ),
                    ...activeConnection.bends,
                  ]
                    .filter(Boolean)
                    .map((point) => `${point.x},${point.y}`)
                    .join(' ')}
                  fill="none"
                  stroke="red"
                  strokeWidth="3"
                />
              </svg>
            )}

            {activeConnection?.bends.map((point, index) => (
              <div
                key={index}
                className="bend-point"
                style={{
                  left: point.x,
                  top: point.y,
                }}
              />
            ))}
          </ViewportPortal>
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="edit-panel">
          <h3>Editar equipamento</h3>

          <p>
            <strong>Tipo:</strong> {selectedNode.data.label}
          </p>

          <label>Descrição visível:</label>

          <textarea
            value={selectedNode.data.description}
            onChange={(event) => {
              const newDescription = event.target.value

              updateNodes((currentNodes) =>
                currentNodes.map((node) =>
                  node.id === selectedNode.id
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          description: newDescription,
                        },
                      }
                    : node
                )
              )

              setSelectedNode((currentNode) => ({
                ...currentNode,
                data: {
                  ...currentNode.data,
                  description: newDescription,
                },
              }))
            }}
          />

          <label>Largura da descrição:</label>

          <input
            type="range"
            min="60"
            max="320"
            step="5"
            value={selectedNode.data.descriptionWidth || 120}
            onChange={(event) => {
              const newDescriptionWidth = Number(event.target.value)

              updateNodes((currentNodes) =>
                currentNodes.map((node) =>
                  node.id === selectedNode.id
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          descriptionWidth: newDescriptionWidth,
                        },
                      }
                    : node
                )
              )

              setSelectedNode((currentNode) => ({
                ...currentNode,
                data: {
                  ...currentNode.data,
                  descriptionWidth: newDescriptionWidth,
                },
              }))
            }}
          />

          {hasConnectionOnHandle(selectedNode.id, 'entrada') && (
            <>
              <label>Vazão de entrada:</label>

              <input
                value={selectedNode.data.inputFlow || ''}
                onChange={(event) => {
                  const newInputFlow = event.target.value

                  updateNodes((currentNodes) =>
                    currentNodes.map((node) =>
                      node.id === selectedNode.id
                        ? {
                            ...node,
                            data: {
                              ...node.data,
                              inputFlow: newInputFlow,
                            },
                          }
                        : node
                    )
                  )

                  setSelectedNode((currentNode) => ({
                    ...currentNode,
                    data: {
                      ...currentNode.data,
                      inputFlow: newInputFlow,
                    },
                  }))
                }}
              />
            </>
          )}

          {selectedNode.data.equipmentType !== 'productPile' &&
            hasConnectionOnHandle(selectedNode.id, 'saida-inferior') && (
              <>
                <label>Vazão da saída inferior:</label>

                <input
                  value={selectedNode.data.bottomOutputFlow || ''}
                  onChange={(event) => {
                    const newBottomOutputFlow = event.target.value

                    updateNodes((currentNodes) =>
                      currentNodes.map((node) =>
                        node.id === selectedNode.id
                          ? {
                              ...node,
                              data: {
                                ...node.data,
                                bottomOutputFlow: newBottomOutputFlow,
                              },
                            }
                          : node
                      )
                    )

                    setSelectedNode((currentNode) => ({
                      ...currentNode,
                      data: {
                        ...currentNode.data,
                        bottomOutputFlow: newBottomOutputFlow,
                      },
                    }))
                  }}
                />
              </>
            )}

          {(selectedNode.data.equipmentType === 'feeder' ||
            selectedNode.data.equipmentType === 'scalper') &&
            hasConnectionOnHandle(selectedNode.id, 'saida-lateral') && (
              <>
                <label>Vazão da saída lateral:</label>

                <input
                  value={selectedNode.data.lateralOutputFlow || ''}
                  onChange={(event) => {
                    const newLateralOutputFlow = event.target.value

                    updateNodes((currentNodes) =>
                      currentNodes.map((node) =>
                        node.id === selectedNode.id
                          ? {
                              ...node,
                              data: {
                                ...node.data,
                                lateralOutputFlow: newLateralOutputFlow,
                              },
                            }
                          : node
                      )
                    )

                    setSelectedNode((currentNode) => ({
                      ...currentNode,
                      data: {
                        ...currentNode.data,
                        lateralOutputFlow: newLateralOutputFlow,
                      },
                    }))
                  }}
                />
              </>
            )}

          {selectedNode.data.equipmentType === 'screen' && (
            <div>
              <label>Quantidade de decks:</label>

              <select
                value={selectedNode.data.decks}
                onChange={(event) => {
                  const newDecks = Number(event.target.value)

                  updateNodes((currentNodes) =>
                    currentNodes.map((node) =>
                      node.id === selectedNode.id
                        ? {
                            ...node,
                            data: {
                              ...node.data,
                              decks: newDecks,
                            },
                          }
                        : node
                    )
                  )

                  setSelectedNode((currentNode) => ({
                    ...currentNode,
                    data: {
                      ...currentNode.data,
                      decks: newDecks,
                    },
                  }))
                }}
              >
                <option value={1}>1 deck</option>
                <option value={2}>2 decks</option>
                <option value={3}>3 decks</option>
                <option value={4}>4 decks</option>
              </select>

              {Array.from({ length: selectedNode.data.decks }).map((_, index) => {
                const deckId = `deck-${index + 1}`

                const hasDeckConnection =
                  hasConnectionOnHandle(selectedNode.id, deckId)

                if (!hasDeckConnection) {
                  return null
                }

                return (
                  <div key={deckId}>
                    <label>Vazão {deckId}:</label>

                    <input
                      value={selectedNode.data.deckFlows?.[deckId] || ''}
                      onChange={(event) => {
                        const newValue = event.target.value

                        updateNodes((currentNodes) =>
                          currentNodes.map((node) =>
                            node.id === selectedNode.id
                              ? {
                                  ...node,
                                  data: {
                                    ...node.data,
                                    deckFlows: {
                                      ...node.data.deckFlows,
                                      [deckId]: newValue,
                                    },
                                  },
                                }
                              : node
                          )
                        )

                        setSelectedNode((currentNode) => ({
                          ...currentNode,
                          data: {
                            ...currentNode.data,
                            deckFlows: {
                              ...currentNode.data.deckFlows,
                              [deckId]: newValue,
                            },
                          },
                        }))
                      }}
                    />
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={() => {
              selectedNodeRef.current = null
              setSelectedNode(null)
            }}
          >
            Fechar
          </button>
        </div>
            )}

      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>GNA Plant</h3>

            <p>
              Tem certeza que deseja limpar o fluxograma?
            </p>

            <p>
              Todas as alterações não salvas serão perdidas.
            </p>

            <div className="modal-buttons">
              <button
                onClick={() => setShowClearConfirm(false)}
              >
                Cancelar
              </button>

              <button
                onClick={() => {
                  clearCanvas()
                  setShowClearConfirm(false)
                }}
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
