import { Handle, Position } from '@xyflow/react'

function EquipmentNode({ data, id }) {
  const decks = data.decks || 0
  const isScreen = data.equipmentType === 'screen'
  const isProductPile = data.equipmentType === 'productPile'
  const isFeedPile = data.equipmentType === 'feedPile'

  function getPileHandleStyle(handleId) {
    const pileHandlePositions = {
      feedPile: {
        'saida-inferior': { x: 58, y: 98 },
      },
      surgePile: {
        entrada: { x: 57, y: 20 },
        'saida-inferior': { x: 57, y: 81 },
      },
      productPile: {
        entrada: { x: 55, y: 14 },
      },
    }

    const position =
      pileHandlePositions[data.equipmentType]?.[handleId]

    if (!position) return undefined

    return {
      left: `${position.x}px`,
      top: `${position.y}px`,
      bottom: 'auto',
      transform: 'translate(-50%, -50%)',
    }
  }

  function getPileFlowLabelStyle(handleId) {
    const pileFlowLabelPositions = {
      feedPile: {
        'saida-inferior': { x: 65, y: 106 },
      },
      surgePile: {
        entrada: { x: 68, y: 10 },
        'saida-inferior': { x: 68, y: 90 },
      },
      productPile: {
        entrada: { x: 67, y: 0 },
      },
    }

    const position =
      pileFlowLabelPositions[data.equipmentType]?.[handleId]

    if (!position) return undefined

    return {
      left: `${position.x}px`,
      top: `${position.y}px`,
      bottom: 'auto',
      transform: 'none',
    }
  }

  function handleConnectorClick(event, handleId) {
    event.stopPropagation()
    data.onConnectorClick?.(id, handleId)
  }

  return (
    <div className="equipment-node">
      {isFeedPile && (
        <div className="equipment-description equipment-description-top">
          {data.description}
        </div>
      )}

      <div className="equipment-visual">
        <img
          src={data.image}
          alt={data.label}
          className={`equipment-image equipment-image-${data.equipmentType}`}
        />

        {data.inputFlow &&
          data.hasConnectionOnHandle?.(id, 'entrada') && (
            <div
              className="flow-label flow-label-input"
              style={getPileFlowLabelStyle('entrada')}
            >
              {data.inputFlow}
            </div>
          )}

        {data.bottomOutputFlow &&
          !isProductPile &&
          data.hasConnectionOnHandle?.(id, 'saida-inferior') && (
            <div
              className="flow-label flow-label-bottom"
              style={
  data.equipmentType === 'screen'
    ? { left: '58%', bottom: '-16px' }
    : getPileFlowLabelStyle('saida-inferior')
}
            >
              {data.bottomOutputFlow}
            </div>
          )}

        {data.lateralOutputFlow &&
          data.hasConnectionOnHandle?.(id, 'saida-lateral') && (
            <div className="flow-label flow-label-side">
              {data.lateralOutputFlow}
            </div>
          )}

        {!isFeedPile && (
          <Handle
            type="source"
            position={Position.Top}
            id="entrada"
            style={getPileHandleStyle('entrada')}
            onClick={(event) => handleConnectorClick(event, 'entrada')}
          />
        )}

        {!isProductPile && (
          <Handle
            type="source"
            position={Position.Bottom}
            id="saida-inferior"
            style={getPileHandleStyle('saida-inferior')}
            onClick={(event) => handleConnectorClick(event, 'saida-inferior')}
          />
        )}

        {(data.equipmentType === 'feeder' ||
          data.equipmentType === 'scalper') && (
          <Handle
            type="source"
            position={Position.Right}
            id="saida-lateral"
            style={{
              top: '40px',
            }}
            onClick={(event) => handleConnectorClick(event, 'saida-lateral')}
          />
        )}

        {isScreen &&
          Array.from({ length: decks }).map((_, index) => {
            const deckId = `deck-${index + 1}`

            return (
              <div key={deckId}>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={deckId}
                  style={{
                    top: `${32 + index * 18}px`,
                  }}
                  onClick={(event) => handleConnectorClick(event, deckId)}
                />

                {data.deckFlows?.[deckId] &&
                  data.hasConnectionOnHandle?.(id, deckId) && (
                    <div
                      className="flow-label flow-label-deck"
                      style={{
                        top: `${23 + index * 18}px`,
                      }}
                    >
                      {data.deckFlows[deckId]}
                    </div>
                  )}
              </div>
            )
          })}
      </div>

      {data.equipmentType === 'productPile' ? (
        <div className="equipment-description equipment-description-bottom">
          {data.description}
        </div>
      ) : !isFeedPile ? (
        <div
          className={`equipment-description ${
            isScreen &&
            Object.values(data.deckFlows || {}).some((value) => value)
              ? 'equipment-description-shifted'
              : ''
          }`}
          style={{
            width: data.descriptionWidth
              ? `${data.descriptionWidth}px`
              : 'fit-content',
            position: 'absolute',
            right: '100%',
            marginRight: '10px',
          }}
        >
          {data.description}
        </div>
      ) : null}
    </div>
  )
}

export default EquipmentNode
