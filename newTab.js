document.addEventListener("DOMContentLoaded", () => {
  const categoriesContainer = document.getElementById("categories-container");
  const tasksContainer = document.getElementById("tasks-container");
  const taskList = document.getElementById("task-list");

  // Initial background image with 5 deers
  const initialBackground = "assets/original.jpg";

  // Background images for each category
  const backgroundSets = {
    daily: [
      "assets/A.jpg", // Category origin photo (shown when no tasks are checked)
      "assets/A1.jpg", // Shown after 1 task is checked
      "assets/A2.jpg", // Shown after 2 tasks are checked
      "assets/A3.jpg", // Shown after 3 tasks are checked
      "assets/A4.jpg", // Shown after 4 tasks are checked
      "assets/A5.jpg", // Shown after all 5 tasks are checked
    ],
    home: [
      "assets/B.jpg",
      "assets/B1.jpg",
      "assets/B2.jpg",
      "assets/B3.jpg",
      "assets/B4.jpg",
      "assets/B5.jpg",
    ],
    pet: [
      "assets/C.jpg",
      "assets/C1.jpg",
      "assets/C2.jpg",
      "assets/C3.jpg",
      "assets/C4.jpg",
      "assets/C5.jpg",
    ],
    friends: [
      "assets/D.jpg",
      "assets/D1.jpg",
      "assets/D2.jpg",
      "assets/D3.jpg",
      "assets/D4.jpg",
      "assets/D5.jpg",
    ],
    mind: [
      "assets/E.jpg",
      "assets/E1.jpg",
      "assets/E2.jpg",
      "assets/E3.jpg",
      "assets/E4.jpg",
      "assets/E5.jpg",
    ],
  };

  // Predefined hardcoded tasks
  const hardcodedTasks = {
    daily: [
      "Wake up",
      "Exercise",
      "Eat breakfast",
      "Plan the day",
      "Start work",
    ],
    home: [
      "Clean kitchen",
      "Do laundry",
      "Vacuum",
      "Organize shelves",
      "Water plants",
    ],
    pet: [
      "Feed pet",
      "Walk pet",
      "Play with pet",
      "Clean litter box",
      "Visit vet",
    ],
    friends: [
      "Call a friend",
      "Plan a hangout",
      "Write a letter",
      "Send a gift",
      "Catch up online",
    ],
    mind: [
      "Meditate",
      "Read a book",
      "Journal thoughts",
      "Learn something new",
      "Practice gratitude",
    ],
  };

  let sortableInstance = null;

  // Load saved state from chrome.storage.local
  chrome.storage.local.get("state", (data) => {
    if (data.state) {
      const {
        tasks,
        backgroundIndex,
        categoriesHidden,
        isFinalImage,
        selectedCategory,
      } = data.state;

      if (isFinalImage) {
        document.body.style.backgroundImage = `url(${
          backgroundSets[selectedCategory][
            backgroundSets[selectedCategory].length - 1
          ]
        })`;
        tasksContainer.classList.add("hidden");
        categoriesContainer.classList.add("hidden");
        document.getElementById("welcome-message").classList.add("hidden");
      } else {
        renderTasks(tasks, backgroundIndex, selectedCategory);
        if (categoriesHidden) {
          categoriesContainer.classList.add("hidden");
          document.getElementById("welcome-message").classList.add("hidden");
        }
        document.body.style.backgroundImage = `url(${backgroundSets[selectedCategory][backgroundIndex]})`;
      }
    } else {
      categoriesContainer.classList.remove("hidden");
      document.getElementById("welcome-message").classList.remove("hidden");
      document.body.style.backgroundImage = `url(${initialBackground})`;
    }
  });

  categoriesContainer.addEventListener("click", (event) => {
    if (event.target.classList.contains("category-button")) {
      const category = event.target.dataset.category;

      if (category === "others") {
        const customTask = prompt("Enter a custom task:");
        if (customTask) {
          chrome.runtime.sendMessage({
            action: "generateSubtasks",
            task: customTask,
          });
        }
      } else {
        const tasks = hardcodedTasks[category].map((task) => ({
          text: task,
          completed: false,
        }));
        chrome.storage.local.set({
          state: {
            tasks,
            backgroundIndex: 0, // Start with the category's origin photo (e.g., A.jpg)
            categoriesHidden: true,
            isFinalImage: false,
            selectedCategory: category,
          },
        });
        // Set the background to the category's origin photo (e.g., A.jpg)
        document.body.style.backgroundImage = `url(${backgroundSets[category][0]})`;
        renderTasks(tasks, 0, category);
      }

      categoriesContainer.classList.add("hidden");
      document.getElementById("welcome-message").classList.add("hidden");
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "updateSubtasks") {
      const tasks = message.subtasks.map((task) => ({
        text: task,
        completed: false,
      }));
      chrome.storage.local.set({
        state: {
          tasks,
          backgroundIndex: 0,
          categoriesHidden: true,
          isFinalImage: false,
          selectedCategory: "others",
        },
      });
      renderTasks(tasks, 0, "self");
    }
  });

  function updateBackgroundState(tasks, selectedCategory) {
    const completedTasks = tasks.filter(
      (task) => task.completed && task.text.trim() !== ""
    ).length;
    const totalTasksWithContent = tasks.filter(
      (task) => task.text.trim() !== ""
    ).length;

    let backgroundIndex;
    let isFinalImage = false;

    if (completedTasks === totalTasksWithContent && totalTasksWithContent > 0) {
      backgroundIndex = backgroundSets[selectedCategory].length - 1;
      isFinalImage = true;
    } else {
      backgroundIndex = Math.min(
        completedTasks,
        backgroundSets[selectedCategory].length - 1
      );
      isFinalImage = false;
    }

    return { backgroundIndex, isFinalImage };
  }

  function sortTasksByCompletion(tasks) {
    // Sort tasks so completed ones are at the top while maintaining relative order
    return [...tasks].sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? -1 : 1;
    });
  }

  function renderTasks(tasks, backgroundIndex, category) {
    const tasksHeader =
      document.getElementById("tasks-header") || document.createElement("div");
    tasksHeader.id = "tasks-header";
    tasksHeader.innerHTML = `
      <h1 class="task-title">Take care of your ${category}</h1>
      <p class="task-subtitle">Do these small and simple tasks to start your day</p>
    `;

    if (!document.getElementById("tasks-header")) {
      tasksContainer.innerHTML = "";
      tasksContainer.appendChild(tasksHeader);

      const newTaskList = document.createElement("ul");
      newTaskList.id = "task-list";
      tasksContainer.appendChild(newTaskList);
    }

    const taskListElement = document.getElementById("task-list");
    taskListElement.innerHTML = "";

    // Sort tasks before rendering
    const sortedTasks = sortTasksByCompletion(tasks);

    sortedTasks.forEach((task, index) => {
      const taskItem = document.createElement("li");
      taskItem.classList.add("draggable");
      taskItem.innerHTML = `
        <input type="checkbox" ${task.completed ? "checked" : ""} />
        <input type="text" value="${
          task.text
        }" placeholder="New task" class="task-text" />
        ${
          task.text && !task.completed
            ? `<button class="delete-task"></button>`
            : ""
        }
        <div class="drag-handle">
         <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
        </div>
      `;

      taskItem.draggable = true;
      taskItem.dataset.index = tasks.indexOf(task); // Use original index

      const checkbox = taskItem.querySelector("input[type='checkbox']");
      checkbox.addEventListener("change", () => {
        const originalIndex = tasks.indexOf(task);
        tasks[originalIndex].completed = checkbox.checked;

        if (tasks[originalIndex].completed) {
          const deleteButton = taskItem.querySelector(".delete-task");
          if (deleteButton) deleteButton.remove();
        }

        // Find where this task should move to
        let newPosition = 0;
        if (checkbox.checked) {
          // If being checked, count completed tasks before this one
          newPosition = tasks.filter(
            (t, i) => t.completed && i < originalIndex
          ).length;
        } else {
          // If being unchecked, move to first uncompleted position
          newPosition = tasks.filter((t) => t.completed).length;
        }

        // Move the task in the array
        const [movedTask] = tasks.splice(originalIndex, 1);
        tasks.splice(newPosition, 0, movedTask);

        const { backgroundIndex: newBackgroundIndex, isFinalImage } =
          updateBackgroundState(tasks, category);

        if (isFinalImage) {
          document.body.style.backgroundImage = `url(${
            backgroundSets[category][backgroundSets[category].length - 1]
          })`;
          tasksContainer.classList.add("hidden");
          categoriesContainer.classList.add("hidden");
          document.getElementById("welcome-message").classList.add("hidden");
        } else {
          document.body.style.backgroundImage = `url(${backgroundSets[category][newBackgroundIndex]})`;
        }

        // Save state
        chrome.storage.local.set({
          state: {
            tasks,
            backgroundIndex: newBackgroundIndex,
            categoriesHidden: true,
            isFinalImage,
            selectedCategory: category,
          },
        });

        // Force animation using Sortable
        if (sortableInstance) {
          const taskItems = Array.from(taskListElement.children);
          const oldItemEl = taskItems[originalIndex];

          // Remove and insert the element at the new position
          taskListElement.removeChild(oldItemEl);
          taskListElement.insertBefore(
            oldItemEl,
            taskListElement.children[newPosition]
          );

          // Trigger animation
          sortableInstance.option("animation", 600);
          sortableInstance.option("onEnd", null);
          const evt = new CustomEvent("sortable:start");
          taskListElement.dispatchEvent(evt);

          // Add animation class to the moved item
          oldItemEl.style.transition = "all 600ms ease";
          oldItemEl.style.animation = "moveTask 600ms ease";

          // Reset the element after animation
          setTimeout(() => {
            oldItemEl.style.transition = "";
            oldItemEl.style.animation = "";
          }, 600);
        }
      });

      const taskTextInput = taskItem.querySelector(".task-text");
      taskTextInput.addEventListener("change", () => {
        const originalIndex = tasks.indexOf(task);
        tasks[originalIndex].text = taskTextInput.value;

        const existingDeleteButton = taskItem.querySelector(".delete-task");

        if (
          tasks[originalIndex].text.trim() !== "" &&
          !tasks[originalIndex].completed &&
          !existingDeleteButton
        ) {
          const deleteButton = document.createElement("button");
          deleteButton.className = "delete-task";

          deleteButton.addEventListener("click", () => {
            tasks.splice(originalIndex, 1);

            if (tasks.length < 5) {
              tasks.push({ text: "", completed: false });
            }

            const { backgroundIndex: newBackgroundIndex, isFinalImage } =
              updateBackgroundState(tasks, category);

            chrome.storage.local.set({
              state: {
                tasks,
                backgroundIndex: newBackgroundIndex,
                categoriesHidden: true,
                isFinalImage,
                selectedCategory: category,
              },
            });

            renderTasks(tasks, backgroundIndex, category);
          });
          taskItem.appendChild(deleteButton);
        }

        chrome.storage.local.set({
          state: {
            tasks,
            backgroundIndex,
            categoriesHidden: true,
            isFinalImage: false,
            selectedCategory: category,
          },
        });
      });

      const deleteButton = taskItem.querySelector(".delete-task");
      if (deleteButton) {
        deleteButton.addEventListener("click", () => {
          const originalIndex = tasks.indexOf(task);
          tasks.splice(originalIndex, 1);

          if (tasks.length < 5) {
            tasks.push({ text: "", completed: false });
          }

          const { backgroundIndex: newBackgroundIndex, isFinalImage } =
            updateBackgroundState(tasks, category);

          chrome.storage.local.set({
            state: {
              tasks,
              backgroundIndex: newBackgroundIndex,
              categoriesHidden: true,
              isFinalImage,
              selectedCategory: category,
            },
          });

          renderTasks(tasks, newBackgroundIndex, category);
        });
      }

      taskListElement.appendChild(taskItem);

      // Add CSS animation keyframes if they don't exist
      if (!document.querySelector("#task-animations")) {
        const style = document.createElement("style");
        style.id = "task-animations";
        style.textContent = `
          @keyframes moveTask {
            0% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
            100% {
              transform: translateY(0);
            }
          }
        `;
        document.head.appendChild(style);
      }
    });

    // Initialize or update SortableJS
    if (sortableInstance) {
      sortableInstance.destroy();
    }

    sortableInstance = new Sortable(taskListElement, {
      animation: 600,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",

      onUpdate: (evt) => {
        const [movedTask] = tasks.splice(evt.oldIndex, 1);
        tasks.splice(evt.newIndex, 0, movedTask);

        const { backgroundIndex: newBackgroundIndex, isFinalImage } =
          updateBackgroundState(tasks, category);

        if (isFinalImage) {
          document.body.style.backgroundImage = `url(${
            backgroundSets[category][backgroundSets[category].length - 1]
          })`;
          tasksContainer.classList.add("hidden");
          categoriesContainer.classList.add("hidden");
          document.getElementById("welcome-message").classList.add("hidden");
        } else {
          document.body.style.backgroundImage = `url(${backgroundSets[category][newBackgroundIndex]})`;
        }

        chrome.storage.local.set({
          state: {
            tasks,
            backgroundIndex: newBackgroundIndex,
            categoriesHidden: true,
            isFinalImage,
            selectedCategory: category,
          },
        });
      },
    });

    tasksContainer.classList.remove("hidden");
  }
});
