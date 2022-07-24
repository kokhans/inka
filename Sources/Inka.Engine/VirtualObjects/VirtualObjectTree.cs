// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using System.Collections.ObjectModel;
using Carcass.Core;
using Inka.Engine.VirtualObjects.Abstracts;

namespace Inka.Engine.VirtualObjects;

public sealed class VirtualObjectTree
{
    private readonly List<VirtualObjectTree> _children;

    public VirtualObjectTree(VirtualObject root)
    {
        ArgumentVerifier.NotNull(root, nameof(root));

        Value = root;
        _children = new List<VirtualObjectTree>();
    }

    public VirtualObjectTree? Parent { get; private init; }
    public ReadOnlyCollection<VirtualObjectTree> Children => _children.AsReadOnly();
    public VirtualObject Value { get; }

    public VirtualObjectTree AddChild(VirtualObject child)
    {
        ArgumentVerifier.NotNull(child, nameof(child));

        VirtualObjectTree node = new(child) { Parent = this };
        _children.Add(node);

        return node;
    }

    public IEnumerable<VirtualObject> Flatten() => new[] { Value }.Concat(_children.SelectMany(x => x.Flatten()));

    public T GetSingle<T>(ShortGuid id) where T : VirtualObject => (T) Flatten().Single(vo => vo.Id == id);

    public List<T> GetMany<T>(params ShortGuid[] ids) where T : VirtualObject =>
        Flatten()
            .Where(vo => ids.Contains(vo.Id))
            .Cast<T>()
            .ToList();
}