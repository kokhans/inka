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

using Carcass.Core;
using Inka.Engine.Pipelines.Documents;
using Inka.Engine.VirtualObjects;

namespace Inka.Modules.Documents.Razor.Navs;

public static class NavBuilder
{
    public static Navs BuildNavs(
        VirtualObjectTree virtualObjectTree,
        List<Document> documents
    )
    {
        ArgumentVerifier.NotNull(virtualObjectTree, nameof(virtualObjectTree));
        ArgumentVerifier.NotNull(documents, nameof(documents));

        return new Navs(virtualObjectTree
            .Flatten()
            .Where(vo => documents.Select(d => d.VirtualObjectId).Contains(vo.Id))
            .Cast<VirtualFile>()
            .Where(vf => !vf.Name.StartsWith("_", StringComparison.InvariantCultureIgnoreCase))
            .GroupBy(vf => vf.RelativePath.Replace(vf.FullName, string.Empty))
            .ToDictionary(g =>
                    g.Key.Replace(@"\", "/", StringComparison.InvariantCultureIgnoreCase),
                g => g.ToList()
                    .Select(vf =>
                        {
                            Document document = documents.Single(d => d.VirtualObjectId.Equals(vf.Id));

                            return new Nav(
                                document.FrontMatter?.Title!,
                                document.Route!
                            )
                            {
                                FrontMatter = document.FrontMatter
                            };
                        }
                    )
                    .ToList()
            )
        );
    }
}