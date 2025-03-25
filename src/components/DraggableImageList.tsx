'use client';

import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableImageListProps {
  images: string[];
  onReorder: (images: string[]) => void;
  onRemove: (index: number) => void;
}

function SortableImage({ url, index, onRemove }: { url: string; index: number; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group w-32 h-32 rounded-lg overflow-hidden border-2 border-border touch-none"
    >
      <Image
        src={url}
        alt={`Image ${index + 1}`}
        fill
        className="object-cover pointer-events-none"
      />
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function DraggableImageList({ images, onReorder, onRemove }: DraggableImageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.indexOf(active.id as string);
      const newIndex = images.indexOf(over.id as string);
      onReorder(arrayMove(images, oldIndex, newIndex));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={images}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex flex-wrap gap-4">
          {images.map((url, index) => (
            <SortableImage
              key={url}
              url={url}
              index={index}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
} 