document.addEventListener("DOMContentLoaded", () => {
  const categoriesContainer = document.getElementById("categories-container");
  const tasksContainer = document.getElementById("tasks-container");
  const taskList = document.getElementById("task-list");

  // Background images
  const backgrounds = [
    "assets/original.jpg",
    "assets/img1.jpg",
    "assets/img2.jpg",
    "assets/img3.jpg",
    "assets/img4.jpg",
    "assets/img5.jpg",
    "assets/final.jpg",
  ];

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
          backgrounds[backgrounds.length - 1]
        })`;
        tasksContainer.classList.add("hidden");
        categoriesContainer.classList.add("hidden");
      } else {
        renderTasks(tasks, backgroundIndex, selectedCategory);
        if (categoriesHidden) {
          categoriesContainer.classList.add("hidden");
        }
        document.body.style.backgroundImage = `url(${backgrounds[backgroundIndex]})`;
      }
    } else {
      categoriesContainer.classList.remove("hidden");
      document.body.style.backgroundImage = `url(${backgrounds[0]})`;
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
            backgroundIndex: 0,
            categoriesHidden: true,
            isFinalImage: false,
            selectedCategory: category,
          },
        });
        renderTasks(tasks, 0, category);
      }

      categoriesContainer.classList.add("hidden");
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

  function updateBackgroundState(tasks) {
    const completedTasks = tasks.filter(
      (task) => task.completed && task.text.trim() !== ""
    ).length;
    const totalTasksWithContent = tasks.filter(
      (task) => task.text.trim() !== ""
    ).length;

    let backgroundIndex;
    let isFinalImage = false;

    if (completedTasks === totalTasksWithContent && totalTasksWithContent > 0) {
      backgroundIndex = backgrounds.length - 1;
      isFinalImage = true;
    } else {
      backgroundIndex = Math.min(completedTasks, backgrounds.length - 1);
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
        <input type="text" value="${task.text}" class="task-text" />
        ${
          task.text && !task.completed
            ? `<button class="delete-task"></button>`
            : ""
        }
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

        const { backgroundIndex: newBackgroundIndex, isFinalImage } =
          updateBackgroundState(tasks);

        if (isFinalImage) {
          document.body.style.backgroundImage = `url(${
            backgrounds[backgrounds.length - 1]
          })`;
          tasksContainer.classList.add("hidden");
          categoriesContainer.classList.add("hidden");
        } else {
          document.body.style.backgroundImage = `url(${backgrounds[newBackgroundIndex]})`;
        }

        // Sort tasks and animate the movement
        const sortedTasks = sortTasksByCompletion(tasks);

        // Update the original tasks array to match the new order
        tasks.length = 0;
        tasks.push(...sortedTasks);

        // Save state before re-rendering
        chrome.storage.local.set({
          state: {
            tasks: sortedTasks,
            backgroundIndex: newBackgroundIndex,
            categoriesHidden: true,
            isFinalImage,
            selectedCategory: category,
          },
        });

        // Use Sortable's animate method to move the task
        if (sortableInstance) {
          const newIndex = sortedTasks.findIndex((t) => t === task);
          sortableInstance.sort(sortedTasks.map((_, i) => i));
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
              updateBackgroundState(tasks);

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
            updateBackgroundState(tasks);

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
          updateBackgroundState(tasks);

        if (isFinalImage) {
          document.body.style.backgroundImage = `url(${
            backgrounds[backgrounds.length - 1]
          })`;
          tasksContainer.classList.add("hidden");
          categoriesContainer.classList.add("hidden");
        } else {
          document.body.style.backgroundImage = `url(${backgrounds[newBackgroundIndex]})`;
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
